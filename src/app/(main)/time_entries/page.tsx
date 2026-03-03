import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Props { searchParams: Promise<{ project_id?: string; user_id?: string; from?: string; to?: string; page?: string }> }

export default async function GlobalTimeEntriesPage({ searchParams }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const sp = await searchParams;
    const page = parseInt(sp.page || "1") || 1;
    const perPage = 50;

    // Build filters
    const where: any = {};
    if (sp.project_id) where.project_id = parseInt(sp.project_id);
    if (sp.user_id) where.user_id = parseInt(sp.user_id);
    if (sp.from || sp.to) {
        where.spent_on = {};
        if (sp.from) where.spent_on.gte = new Date(sp.from);
        if (sp.to) where.spent_on.lte = new Date(sp.to);
    }

    // Access control: non-admin sees only their own projects
    if (!user.admin) {
        const memberships = await prisma.members.findMany({ where: { user_id: user.id }, select: { project_id: true } });
        where.project_id = { in: memberships.map(m => m.project_id) };
    }

    const [entries, total] = await Promise.all([
        prisma.time_entries.findMany({ where, orderBy: { spent_on: "desc" }, skip: (page - 1) * perPage, take: perPage }),
        prisma.time_entries.count({ where }),
    ]);

    // Resolve names
    const projectIds = [...new Set(entries.map(e => e.project_id))];
    const userIds = [...new Set(entries.map(e => e.user_id))];
    const [projects, users, activities] = await Promise.all([
        prisma.projects.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, identifier: true } }),
        prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, firstname: true, lastname: true, login: true } }),
        prisma.enumerations.findMany({ where: { type: "TimeEntryActivity" }, select: { id: true, name: true } }),
    ]);
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
    const userMap = Object.fromEntries(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim() || u.login]));
    const activityMap = Object.fromEntries(activities.map(a => [a.id, a.name]));
    const totalPages = Math.ceil(total / perPage);
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">Spent Time</h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <div className="text-sm text-muted-foreground">{total} entries · {totalHours.toFixed(2)} hours total</div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-muted/50"><tr>
                            <th className="px-3 py-2 text-left font-medium">Date</th>
                            <th className="px-3 py-2 text-left font-medium">Project</th>
                            <th className="px-3 py-2 text-left font-medium">User</th>
                            <th className="px-3 py-2 text-left font-medium">Activity</th>
                            <th className="px-3 py-2 text-left font-medium">Issue</th>
                            <th className="px-3 py-2 text-left font-medium">Comment</th>
                            <th className="px-3 py-2 text-right font-medium">Hours</th>
                        </tr></thead>
                        <tbody className="divide-y">
                            {entries.map(e => {
                                const proj = projectMap[e.project_id];
                                return (
                                    <tr key={e.id} className="hover:bg-muted/30">
                                        <td className="px-3 py-2">{e.spent_on ? new Date(e.spent_on).toLocaleDateString() : ""}</td>
                                        <td className="px-3 py-2">{proj ? <Link href={`/projects/${proj.identifier}/time_entries`} className="text-primary hover:underline">{proj.name}</Link> : "-"}</td>
                                        <td className="px-3 py-2">{userMap[e.user_id] || "-"}</td>
                                        <td className="px-3 py-2">{activityMap[e.activity_id] || "-"}</td>
                                        <td className="px-3 py-2">{e.issue_id ? `#${e.issue_id}` : ""}</td>
                                        <td className="px-3 py-2 truncate max-w-[200px]">{e.comments || ""}</td>
                                        <td className="px-3 py-2 text-right font-mono">{e.hours.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex gap-1 text-sm">
                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                            <Link key={i} href={`/time_entries?page=${i + 1}${sp.project_id ? `&project_id=${sp.project_id}` : ""}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`}
                                className={`px-2 py-1 rounded ${page === i + 1 ? "bg-primary text-white" : "hover:bg-muted"}`}>{i + 1}</Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
