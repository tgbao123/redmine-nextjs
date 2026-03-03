import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, jsonError } from "@/lib/api/auth";

// GET /api/v1/time_entries/export?format=csv
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");

    const where: any = {};
    if (projectId) where.project_id = parseInt(projectId);

    const entries = await prisma.time_entries.findMany({
        where, orderBy: { spent_on: "desc" }, take: 500,
        select: { id: true, project_id: true, issue_id: true, user_id: true, hours: true, spent_on: true, comments: true, activity_id: true },
    });

    const [projects, users, activities] = await Promise.all([
        prisma.projects.findMany({ select: { id: true, name: true } }),
        prisma.users.findMany({ where: { type: "User" }, select: { id: true, login: true, firstname: true, lastname: true } }),
        prisma.enumerations.findMany({ where: { type: "TimeEntryActivity" }, select: { id: true, name: true } }),
    ]);

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
    const userMap = Object.fromEntries(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim() || u.login]));
    const activityMap = Object.fromEntries(activities.map(a => [a.id, a.name]));

    const header = "Date,User,Activity,Project,Issue,Comment,Hours";
    const rows = entries.map(e =>
        [e.spent_on?.toISOString().split("T")[0] || "", userMap[e.user_id] || "",
        activityMap[e.activity_id] || "", projectMap[e.project_id] || "",
        e.issue_id || "", `"${(e.comments || "").replace(/"/g, '""')}"`,
        e.hours || 0].join(",")
    );

    return new NextResponse([header, ...rows].join("\n"), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=time_entries.csv" },
    });
}
