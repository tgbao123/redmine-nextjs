import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { GanttChart } from "./gantt-chart";

interface Props { params: Promise<{ identifier: string }>; searchParams: Promise<{ months?: string }> }

export default async function GanttPage({ params, searchParams }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;
    const { months = "3" } = await searchParams;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const monthCount = parseInt(months) || 3;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthCount);

    const [issues, versions] = await Promise.all([
        prisma.issues.findMany({
            where: { project_id: project.id, OR: [{ start_date: { not: null } }, { due_date: { not: null } }] },
            select: { id: true, subject: true, tracker_id: true, start_date: true, due_date: true, done_ratio: true, status_id: true, assigned_to_id: true },
            orderBy: { start_date: "asc" },
        }),
        prisma.versions.findMany({ where: { project_id: project.id, effective_date: { not: null } }, select: { id: true, name: true, effective_date: true }, orderBy: { effective_date: "asc" } }),
    ]);

    const [trackers, statuses] = await Promise.all([
        prisma.trackers.findMany({ select: { id: true, name: true } }),
        prisma.issue_statuses.findMany({ select: { id: true, name: true, is_closed: true } }),
    ]);

    const trackerMap = Object.fromEntries(trackers.map(t => [t.id, t.name]));
    const statusMap = Object.fromEntries(statuses.map(s => [s.id, { name: s.name, isClosed: s.is_closed }]));

    const ganttIssues = issues.map(i => ({
        id: i.id, subject: i.subject, tracker: trackerMap[i.tracker_id] || "",
        start: i.start_date?.toISOString().split("T")[0] || null,
        end: i.due_date?.toISOString().split("T")[0] || null,
        done: i.done_ratio, isClosed: statusMap[i.status_id]?.isClosed || false,
    }));

    const ganttVersions = versions.map(v => ({
        id: v.id, name: v.name, date: v.effective_date?.toISOString().split("T")[0] || "",
    }));

    return <GanttChart project={project} issues={ganttIssues} versions={ganttVersions}
        startDate={startDate.toISOString().split("T")[0]} endDate={endDate.toISOString().split("T")[0]} monthCount={monthCount} />;
}
