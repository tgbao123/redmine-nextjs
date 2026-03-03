import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/time_entries.json
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
    const projectId = url.searchParams.get("project_id");

    const where: any = {};
    if (projectId) where.project_id = parseInt(projectId);
    if (!user.admin && !projectId) where.user_id = user.id;

    const [entries, totalCount] = await Promise.all([
        prisma.time_entries.findMany({ where, orderBy: { spent_on: "desc" }, skip: offset, take: limit }),
        prisma.time_entries.count({ where }),
    ]);

    return jsonOk({
        time_entries: entries.map(e => ({
            id: e.id, project: { id: e.project_id }, issue: e.issue_id ? { id: e.issue_id } : undefined,
            user: { id: e.user_id }, activity: { id: e.activity_id },
            hours: Number(e.hours), comments: e.comments || "", spent_on: e.spent_on,
            created_on: e.created_on, updated_on: e.updated_on,
        })),
        total_count: totalCount, offset, limit,
    });
}

// POST /api/v1/time_entries.json
export async function POST(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    try {
        const body = await req.json();
        const te = body.time_entry;
        if (!te?.hours || !te?.activity_id) return jsonError("hours and activity_id required", 422);

        const projectId = te.project_id || (te.issue_id ? (await prisma.issues.findFirst({ where: { id: te.issue_id }, select: { project_id: true } }))?.project_id : null);
        if (!projectId) return jsonError("project_id or issue_id required", 422);

        const spentOn = te.spent_on ? new Date(te.spent_on) : new Date();
        const entry = await prisma.time_entries.create({
            data: {
                project_id: projectId, issue_id: te.issue_id || null, user_id: user.id,
                hours: te.hours, activity_id: te.activity_id, spent_on: spentOn,
                comments: te.comments || "",
                tyear: spentOn.getFullYear(), tmonth: spentOn.getMonth() + 1,
                tweek: Math.ceil((spentOn.getTime() - new Date(spentOn.getFullYear(), 0, 1).getTime()) / 86400000 / 7),
                created_on: new Date(), updated_on: new Date(),
            },
        });

        return jsonOk({ time_entry: { id: entry.id } });
    } catch (e: any) { return jsonError(e.message, 500); }
}
