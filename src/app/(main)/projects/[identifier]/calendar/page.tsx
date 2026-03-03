import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { CalendarView } from "./calendar-view";

interface Props { params: Promise<{ identifier: string }>; searchParams: Promise<{ year?: string; month?: string }> }

export default async function CalendarPage({ params, searchParams }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;
    const sp = await searchParams;

    const now = new Date();
    const year = parseInt(sp.year || "") || now.getFullYear();
    const month = parseInt(sp.month || "") || now.getMonth() + 1;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // last day of month

    const issues = await prisma.issues.findMany({
        where: {
            project_id: project.id,
            OR: [
                { start_date: { gte: monthStart, lte: monthEnd } },
                { due_date: { gte: monthStart, lte: monthEnd } },
            ],
        },
        select: { id: true, subject: true, tracker_id: true, start_date: true, due_date: true, status_id: true },
    });

    const trackers = await prisma.trackers.findMany({ select: { id: true, name: true } });
    const trackerMap = Object.fromEntries(trackers.map(t => [t.id, t.name]));

    const calendarIssues = issues.map(i => ({
        id: i.id, subject: i.subject, tracker: trackerMap[i.tracker_id] || "",
        startDate: i.start_date?.toISOString().split("T")[0] || null,
        dueDate: i.due_date?.toISOString().split("T")[0] || null,
    }));

    return <CalendarView project={project} issues={calendarIssues} year={year} month={month} />;
}
