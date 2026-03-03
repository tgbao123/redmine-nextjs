import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, jsonError } from "@/lib/api/auth";

// GET /api/v1/issues/export?format=csv&project_id=...&status_id=...
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "csv";
    const projectId = url.searchParams.get("project_id");
    const statusId = url.searchParams.get("status_id");
    const trackerId = url.searchParams.get("tracker_id");

    const where: any = {};
    if (projectId) where.project_id = parseInt(projectId);
    if (statusId) where.status_id = parseInt(statusId);
    if (trackerId) where.tracker_id = parseInt(trackerId);

    const issues = await prisma.issues.findMany({
        where, orderBy: { id: "asc" }, take: 500,
        select: {
            id: true, subject: true, tracker_id: true, status_id: true, priority_id: true,
            assigned_to_id: true, author_id: true, project_id: true,
            start_date: true, due_date: true, estimated_hours: true, done_ratio: true,
            created_on: true, updated_on: true, description: true,
        },
    });

    // Fetch lookup data
    const [trackers, statuses, priorities, projects] = await Promise.all([
        prisma.trackers.findMany({ select: { id: true, name: true } }),
        prisma.issue_statuses.findMany({ select: { id: true, name: true } }),
        prisma.enumerations.findMany({ where: { type: "IssuePriority" }, select: { id: true, name: true } }),
        prisma.projects.findMany({ select: { id: true, name: true } }),
    ]);

    const trackerMap = Object.fromEntries(trackers.map(t => [t.id, t.name]));
    const statusMap = Object.fromEntries(statuses.map(s => [s.id, s.name]));
    const priorityMap = Object.fromEntries(priorities.map(p => [p.id, p.name]));
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

    if (format === "csv") {
        const header = "#,Project,Tracker,Status,Priority,Subject,Assignee,Start date,Due date,% Done,Est. hours,Created,Updated";
        const rows = issues.map(i =>
            [i.id, projectMap[i.project_id] || "", trackerMap[i.tracker_id] || "", statusMap[i.status_id] || "",
            priorityMap[i.priority_id] || "", `"${(i.subject || "").replace(/"/g, '""')}"`,
            i.assigned_to_id || "", i.start_date || "", i.due_date || "", i.done_ratio || 0,
            i.estimated_hours || "", i.created_on?.toISOString().split("T")[0] || "",
            i.updated_on?.toISOString().split("T")[0] || ""].join(",")
        );
        const csv = [header, ...rows].join("\n");
        return new NextResponse(csv, {
            headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=issues.csv" },
        });
    }

    return jsonError("Unsupported format", 400);
}
