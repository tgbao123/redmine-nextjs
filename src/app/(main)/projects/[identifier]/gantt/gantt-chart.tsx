"use client";
import Link from "next/link";

interface GanttIssue { id: number; subject: string; tracker: string; start: string | null; end: string | null; done: number; isClosed: boolean }
interface GanttVersion { id: number; name: string; date: string }
interface Props {
    project: { id: number; name: string; identifier: string | null };
    issues: GanttIssue[]; versions: GanttVersion[];
    startDate: string; endDate: string; monthCount: number;
}

const TRACKER_COLORS: Record<string, string> = { Bug: "#ef4444", Feature: "#3b82f6", Support: "#22c55e", Refactor: "#a855f7" };

export function GanttChart({ project, issues, versions, startDate, endDate, monthCount }: Props) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    const basePath = `/projects/${project.identifier}`;
    const dayWidth = 20;
    const rowHeight = 28;
    const headerHeight = 50;
    const labelWidth = 280;
    const svgWidth = labelWidth + totalDays * dayWidth;
    const svgHeight = headerHeight + (issues.length + versions.length) * rowHeight + 20;

    const dayToX = (date: string) => {
        const d = new Date(date);
        const diff = Math.max(0, Math.ceil((d.getTime() - start.getTime()) / 86400000));
        return labelWidth + diff * dayWidth;
    };

    // Generate month labels
    const months: { label: string; x: number; width: number }[] = [];
    const cur = new Date(start);
    while (cur < end) {
        const mStart = new Date(cur);
        cur.setMonth(cur.getMonth() + 1);
        const mEnd = new Date(Math.min(cur.getTime(), end.getTime()));
        const mDays = Math.ceil((mEnd.getTime() - mStart.getTime()) / 86400000);
        months.push({ label: mStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }), x: dayToX(mStart.toISOString().split("T")[0]), width: mDays * dayWidth });
    }

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » Gantt</h1>
            </div>
            <div className="px-6 py-4 overflow-x-auto">
                <div className="flex gap-2 mb-3 text-sm">
                    {[3, 6, 12].map(m => (
                        <Link key={m} href={`${basePath}/gantt?months=${m}`}
                            className={`px-2 py-1 rounded ${monthCount === m ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}>{m} months</Link>
                    ))}
                </div>
                <svg width={svgWidth} height={svgHeight} className="text-sm">
                    {/* Month headers */}
                    {months.map((m, i) => (
                        <g key={i}><rect x={m.x} y={0} width={m.width} height={headerHeight} fill={i % 2 === 0 ? "#f3f4f6" : "#e5e7eb"} stroke="#d1d5db" />
                            <text x={m.x + m.width / 2} y={30} textAnchor="middle" className="text-xs fill-gray-600">{m.label}</text></g>
                    ))}
                    {/* Today line */}
                    <line x1={dayToX(new Date().toISOString().split("T")[0])} y1={headerHeight} x2={dayToX(new Date().toISOString().split("T")[0])} y2={svgHeight} stroke="#ef4444" strokeWidth={2} strokeDasharray="4" />
                    {/* Issues */}
                    {issues.map((issue, i) => {
                        const y = headerHeight + i * rowHeight;
                        const color = TRACKER_COLORS[issue.tracker] || "#6b7280";
                        const barStart = issue.start ? dayToX(issue.start) : null;
                        const barEnd = issue.end ? dayToX(issue.end) : null;
                        return (
                            <g key={issue.id}>
                                <rect x={0} y={y} width={labelWidth} height={rowHeight} fill={i % 2 === 0 ? "#ffffff" : "#fafafa"} stroke="#e5e7eb" />
                                <text x={8} y={y + 18} className="text-xs fill-gray-700" style={{ fontSize: 11 }}>
                                    {issue.isClosed ? "✓ " : ""}#{issue.id} {issue.subject.substring(0, 35)}
                                </text>
                                {barStart && barEnd && (
                                    <>
                                        <rect x={barStart} y={y + 6} width={Math.max(barEnd - barStart, dayWidth)} height={16} rx={3} fill={color} opacity={0.3} />
                                        <rect x={barStart} y={y + 6} width={Math.max((barEnd - barStart) * issue.done / 100, 2)} height={16} rx={3} fill={color} />
                                    </>
                                )}
                            </g>
                        );
                    })}
                    {/* Milestones */}
                    {versions.map((v, i) => {
                        const y = headerHeight + (issues.length + i) * rowHeight;
                        const x = dayToX(v.date);
                        return (
                            <g key={v.id}>
                                <rect x={0} y={y} width={labelWidth} height={rowHeight} fill="#fef3c7" stroke="#e5e7eb" />
                                <text x={8} y={y + 18} className="text-xs fill-amber-700 font-medium" style={{ fontSize: 11 }}>🏁 {v.name}</text>
                                <polygon points={`${x},${y + 6} ${x + 8},${y + 14} ${x},${y + 22} ${x - 8},${y + 14}`} fill="#f59e0b" />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
