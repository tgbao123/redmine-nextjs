import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

interface Props { searchParams: Promise<{ criteria?: string }> }

export default async function TimeReportPage({ searchParams }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const sp = await searchParams;
    const groupBy = sp.criteria || "project";

    // Access control
    const where: any = {};
    if (!user.admin) {
        const memberships = await prisma.members.findMany({ where: { user_id: user.id }, select: { project_id: true } });
        where.project_id = { in: memberships.map(m => m.project_id) };
    }

    const entries = await prisma.time_entries.findMany({ where, select: { project_id: true, user_id: true, activity_id: true, hours: true } });

    // Resolve labels
    const projectIds = [...new Set(entries.map(e => e.project_id))];
    const userIds = [...new Set(entries.map(e => e.user_id))];
    const [projects, users, activities] = await Promise.all([
        prisma.projects.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }),
        prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, firstname: true, lastname: true, login: true } }),
        prisma.enumerations.findMany({ where: { type: "TimeEntryActivity" }, select: { id: true, name: true } }),
    ]);
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
    const userMap = Object.fromEntries(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim() || u.login]));
    const activityMap = Object.fromEntries(activities.map(a => [a.id, a.name]));

    // Group
    type Group = { label: string; hours: number; count: number };
    const groups = new Map<string, Group>();
    for (const e of entries) {
        let key: string;
        if (groupBy === "user") key = userMap[e.user_id] || `User ${e.user_id}`;
        else if (groupBy === "activity") key = activityMap[e.activity_id] || `Activity ${e.activity_id}`;
        else key = projectMap[e.project_id] || `Project ${e.project_id}`;
        const g = groups.get(key) || { label: key, hours: 0, count: 0 };
        g.hours += e.hours; g.count += 1;
        groups.set(key, g);
    }
    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.hours - a.hours);
    const totalHours = sortedGroups.reduce((sum, g) => sum + g.hours, 0);

    const criteria = ["project", "user", "activity"];

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">Time Report</h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <div className="flex gap-2 text-sm">
                    Group by: {criteria.map(c => (
                        <a key={c} href={`/time_entries/report?criteria=${c}`}
                            className={`px-2 py-1 rounded capitalize ${groupBy === c ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"}`}>{c}</a>
                    ))}
                </div>
                <table className="min-w-full text-sm">
                    <thead className="bg-muted/50"><tr>
                        <th className="px-3 py-2 text-left font-medium capitalize">{groupBy}</th>
                        <th className="px-3 py-2 text-right font-medium">Entries</th>
                        <th className="px-3 py-2 text-right font-medium">Hours</th>
                    </tr></thead>
                    <tbody className="divide-y">
                        {sortedGroups.map(g => (
                            <tr key={g.label} className="hover:bg-muted/30">
                                <td className="px-3 py-2 font-medium">{g.label}</td>
                                <td className="px-3 py-2 text-right">{g.count}</td>
                                <td className="px-3 py-2 text-right font-mono">{g.hours.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t-2 font-bold"><tr>
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">{entries.length}</td>
                        <td className="px-3 py-2 text-right font-mono">{totalHours.toFixed(2)}</td>
                    </tr></tfoot>
                </table>
            </div>
        </div>
    );
}
