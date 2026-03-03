import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/issues.json
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
    const projectId = url.searchParams.get("project_id");
    const statusId = url.searchParams.get("status_id");
    const trackerId = url.searchParams.get("tracker_id");
    const assignedToId = url.searchParams.get("assigned_to_id");

    const where: any = {};

    // Access control
    if (!user.admin) {
        const memberships = await prisma.members.findMany({ where: { user_id: user.id }, select: { project_id: true } });
        const publicIds = (await prisma.projects.findMany({ where: { status: 1, is_public: true }, select: { id: true } })).map(p => p.id);
        where.project_id = { in: [...new Set([...memberships.map(m => m.project_id), ...publicIds])] };
    }

    if (projectId) where.project_id = parseInt(projectId);
    if (statusId) where.status_id = statusId === "open"
        ? { in: (await prisma.issue_statuses.findMany({ where: { is_closed: false }, select: { id: true } })).map(s => s.id) }
        : statusId === "closed"
            ? { in: (await prisma.issue_statuses.findMany({ where: { is_closed: true }, select: { id: true } })).map(s => s.id) }
            : parseInt(statusId);
    if (trackerId) where.tracker_id = parseInt(trackerId);
    if (assignedToId) where.assigned_to_id = assignedToId === "me" ? user.id : parseInt(assignedToId);

    const [issues, totalCount] = await Promise.all([
        prisma.issues.findMany({ where, orderBy: { updated_on: "desc" }, skip: offset, take: limit }),
        prisma.issues.count({ where }),
    ]);

    return jsonOk({
        issues: issues.map(i => ({
            id: i.id, project: { id: i.project_id }, tracker: { id: i.tracker_id }, status: { id: i.status_id },
            priority: { id: i.priority_id }, author: { id: i.author_id }, assigned_to: i.assigned_to_id ? { id: i.assigned_to_id } : null,
            subject: i.subject, description: i.description || "", start_date: i.start_date, due_date: i.due_date,
            done_ratio: i.done_ratio, estimated_hours: i.estimated_hours ? Number(i.estimated_hours) : null,
            created_on: i.created_on, updated_on: i.updated_on,
        })),
        total_count: totalCount, offset, limit,
    });
}

// POST /api/v1/issues.json
export async function POST(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    try {
        const body = await req.json();
        const issue = body.issue;
        if (!issue?.project_id || !issue?.subject) return jsonError("project_id and subject are required", 422);

        const newIssue = await prisma.issues.create({
            data: {
                project_id: issue.project_id, tracker_id: issue.tracker_id || 1, subject: issue.subject,
                description: issue.description || "", status_id: issue.status_id || 1, priority_id: issue.priority_id || 2,
                author_id: user.id, assigned_to_id: issue.assigned_to_id || null,
                start_date: issue.start_date ? new Date(issue.start_date) : null,
                due_date: issue.due_date ? new Date(issue.due_date) : null,
                done_ratio: issue.done_ratio || 0, estimated_hours: issue.estimated_hours || null,
                lft: 1, rgt: 2, lock_version: 0,
                created_on: new Date(), updated_on: new Date(),
            },
        });

        return jsonOk({ issue: { id: newIssue.id } });
    } catch (e: any) { return jsonError(e.message, 500); }
}
