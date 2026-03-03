"use client";
import Link from "next/link";

interface CalendarIssue { id: number; subject: string; tracker: string; startDate: string | null; dueDate: string | null }
interface Props {
    project: { id: number; name: string; identifier: string | null };
    issues: CalendarIssue[]; year: number; month: number;
}

const TRACKER_COLORS: Record<string, string> = { Bug: "bg-red-100 text-red-700", Feature: "bg-blue-100 text-blue-700", Support: "bg-green-100 text-green-700" };
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({ project, issues, year, month }: Props) {
    const basePath = `/projects/${project.identifier}`;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    // Monday = 0 based
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const weeks: (number | null)[][] = [];
    let day = 1 - startDow;
    while (day <= daysInMonth) {
        const week: (number | null)[] = [];
        for (let i = 0; i < 7; i++) {
            week.push(day >= 1 && day <= daysInMonth ? day : null);
            day++;
        }
        weeks.push(week);
    }

    const getIssuesForDay = (d: number) => {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return issues.filter(i => i.startDate === dateStr || i.dueDate === dateStr);
    };

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » Calendar</h1>
            </div>
            <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                    <Link href={`${basePath}/calendar?year=${prevYear}&month=${prevMonth}`} className="text-primary hover:underline text-sm">← Previous</Link>
                    <h2 className="text-xl font-bold">{monthLabel}</h2>
                    <Link href={`${basePath}/calendar?year=${nextYear}&month=${nextMonth}`} className="text-primary hover:underline text-sm">Next →</Link>
                </div>
                <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border rounded overflow-hidden">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="bg-gray-100 dark:bg-gray-800 text-center text-xs font-medium py-1">{d}</div>
                    ))}
                    {weeks.flat().map((d, i) => {
                        const dayIssues = d ? getIssuesForDay(d) : [];
                        const isToday = d && new Date().getDate() === d && new Date().getMonth() + 1 === month && new Date().getFullYear() === year;
                        return (
                            <div key={i} className={`bg-white dark:bg-gray-900 min-h-[80px] p-1 ${!d ? "bg-gray-50 dark:bg-gray-950" : ""} ${isToday ? "ring-2 ring-blue-400 ring-inset" : ""}`}>
                                {d && <div className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-500"}`}>{d}</div>}
                                {dayIssues.slice(0, 3).map(issue => (
                                    <Link key={issue.id} href={`${basePath}/issues/${issue.id}`}
                                        className={`block text-xs px-1 py-0.5 mb-0.5 rounded truncate ${TRACKER_COLORS[issue.tracker] || "bg-gray-100 text-gray-700"}`}>
                                        #{issue.id} {issue.subject}
                                    </Link>
                                ))}
                                {dayIssues.length > 3 && <div className="text-xs text-gray-400">+{dayIssues.length - 3} more</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
