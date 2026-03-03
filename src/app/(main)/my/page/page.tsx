import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MyDashboardPage() {
    const user = await getSession();
    if (!user) redirect("/login");

    // Fetch dashboard data in parallel
    const [assignedIssues, reportedIssues, latestNews, recentActivity] = await Promise.all([
        // Issues assigned to me
        prisma.issues.findMany({
            where: { assigned_to_id: user.id, status_id: { in: (await prisma.issue_statuses.findMany({ where: { is_closed: false }, select: { id: true } })).map(s => s.id) } },
            orderBy: { updated_on: "desc" }, take: 10,
            select: { id: true, subject: true, tracker_id: true, status_id: true, priority_id: true, project_id: true, updated_on: true },
        }),
        // Issues reported by me
        prisma.issues.findMany({
            where: { author_id: user.id, status_id: { in: (await prisma.issue_statuses.findMany({ where: { is_closed: false }, select: { id: true } })).map(s => s.id) } },
            orderBy: { updated_on: "desc" }, take: 10,
            select: { id: true, subject: true, tracker_id: true, status_id: true, priority_id: true, project_id: true, updated_on: true },
        }),
        // Latest news
        prisma.news.findMany({
            orderBy: { created_on: "desc" }, take: 5,
            select: { id: true, title: true, summary: true, project_id: true, created_on: true },
        }),
        // Recent activity (journals)
        prisma.journals.findMany({
            orderBy: { created_on: "desc" }, take: 10,
            select: { id: true, journalized_id: true, journalized_type: true, user_id: true, notes: true, created_on: true },
        }),
    ]);

    // Fetch lookup data
    const projectIds = [...new Set([
        ...assignedIssues.map(i => i.project_id),
        ...reportedIssues.map(i => i.project_id),
        ...latestNews.map(n => n.project_id),
    ].filter((id): id is number => id !== null))];
    const trackerIds = [...new Set([...assignedIssues, ...reportedIssues].map(i => i.tracker_id))];
    const statusIds = [...new Set([...assignedIssues, ...reportedIssues].map(i => i.status_id))];

    const [projects, trackers, statuses] = await Promise.all([
        prisma.projects.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, identifier: true } }),
        prisma.trackers.findMany({ where: { id: { in: trackerIds } }, select: { id: true, name: true } }),
        prisma.issue_statuses.findMany({ where: { id: { in: statusIds } }, select: { id: true, name: true } }),
    ]);

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
    const trackerMap = Object.fromEntries(trackers.map(t => [t.id, t.name]));
    const statusMap = Object.fromEntries(statuses.map(s => [s.id, s.name]));

    const renderIssueTable = (issues: typeof assignedIssues, title: string) => (
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
            <h3 className="font-semibold text-sm text-gray-500 mb-3">{title} ({issues.length})</h3>
            {issues.length === 0 ? (
                <p className="text-sm text-gray-400">No issues</p>
            ) : (
                <table className="w-full text-sm">
                    <thead><tr className="border-b text-left">
                        <th className="py-1 font-medium">#</th><th className="py-1 font-medium">Project</th>
                        <th className="py-1 font-medium">Tracker</th><th className="py-1 font-medium">Subject</th>
                        <th className="py-1 font-medium">Status</th>
                    </tr></thead>
                    <tbody>
                        {issues.map(i => {
                            const proj = projectMap[i.project_id];
                            return (
                                <tr key={i.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="py-1.5"><Link href={`/projects/${proj?.identifier}/issues/${i.id}`} className="text-blue-600 hover:underline">#{i.id}</Link></td>
                                    <td className="py-1.5 text-gray-500">{proj?.name || ""}</td>
                                    <td className="py-1.5 text-gray-500">{trackerMap[i.tracker_id] || ""}</td>
                                    <td className="py-1.5">{i.subject}</td>
                                    <td className="py-1.5 text-gray-500">{statusMap[i.status_id] || ""}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">My page</h1>
            </div>
            <div className="px-6 py-6 space-y-6 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {renderIssueTable(assignedIssues, "Issues assigned to me")}
                    {renderIssueTable(reportedIssues, "Reported issues")}
                </div>

                {/* Latest News */}
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                    <h3 className="font-semibold text-sm text-gray-500 mb-3">Latest news</h3>
                    {latestNews.length === 0 ? (
                        <p className="text-sm text-gray-400">No news</p>
                    ) : (
                        <div className="space-y-3">
                            {latestNews.map(n => {
                                const proj = n.project_id ? projectMap[n.project_id] : null;
                                return (
                                    <div key={n.id} className="border-b pb-2 last:border-0">
                                        <Link href={`/projects/${proj?.identifier}/news/${n.id}`} className="text-blue-600 hover:underline font-medium text-sm">{n.title}</Link>
                                        <p className="text-xs text-gray-500 mt-0.5">{proj?.name} · {n.created_on ? new Date(n.created_on).toLocaleDateString() : ""}</p>
                                        {n.summary && <p className="text-xs text-gray-400 mt-0.5">{n.summary}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
