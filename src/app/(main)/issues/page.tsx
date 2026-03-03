import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Props { searchParams: Promise<{ status?: string; tracker?: string; page?: string }> }

export default async function GlobalIssuesPage({ searchParams }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const sp = await searchParams;

    const page = parseInt(sp.page || "1");
    const perPage = 25;

    // Build accessible project IDs
    let projectIds: number[];
    if (user.admin) {
        const projects = await prisma.projects.findMany({ where: { status: 1 }, select: { id: true } });
        projectIds = projects.map(p => p.id);
    } else {
        const [memberships, publicProjects] = await Promise.all([
            prisma.members.findMany({ where: { user_id: user.id }, select: { project_id: true } }),
            prisma.projects.findMany({ where: { status: 1, is_public: true }, select: { id: true } }),
        ]);
        projectIds = [...new Set([...memberships.map(m => m.project_id), ...publicProjects.map(p => p.id)])];
    }

    const where: any = { project_id: { in: projectIds } };
    if (sp.tracker) where.tracker_id = parseInt(sp.tracker);
    if (sp.status === "closed") {
        const closed = await prisma.issue_statuses.findMany({ where: { is_closed: true }, select: { id: true } });
        where.status_id = { in: closed.map(s => s.id) };
    } else if (sp.status !== "*") {
        const open = await prisma.issue_statuses.findMany({ where: { is_closed: false }, select: { id: true } });
        where.status_id = { in: open.map(s => s.id) };
    }

    const [issues, totalCount, trackers, projects] = await Promise.all([
        prisma.issues.findMany({
            where, orderBy: { updated_on: "desc" }, skip: (page - 1) * perPage, take: perPage,
            select: { id: true, subject: true, tracker_id: true, status_id: true, priority_id: true, project_id: true, updated_on: true, assigned_to_id: true }
        }),
        prisma.issues.count({ where }),
        prisma.trackers.findMany({ select: { id: true, name: true } }),
        prisma.projects.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, identifier: true } }),
    ]);

    const trackerMap = Object.fromEntries(trackers.map(t => [t.id, t.name]));
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
    const totalPages = Math.ceil(totalCount / perPage);

    return (
        <div className="space-y-4 p-6">
            <h1 className="text-2xl font-bold">Issues</h1>
            <div className="flex gap-3 text-sm">
                <Link href="/issues" className={`px-2 py-1 rounded ${!sp.status || sp.status === "open" ? "bg-primary text-primary-foreground" : "border"}`}>Open</Link>
                <Link href="/issues?status=closed" className={`px-2 py-1 rounded ${sp.status === "closed" ? "bg-primary text-primary-foreground" : "border"}`}>Closed</Link>
                <Link href="/issues?status=*" className={`px-2 py-1 rounded ${sp.status === "*" ? "bg-primary text-primary-foreground" : "border"}`}>All</Link>
            </div>
            <div className="text-sm text-muted-foreground">{totalCount} issues</div>
            <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Project</th><th className="text-left px-3 py-2">Tracker</th><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Updated</th></tr>
                </thead>
                <tbody>
                    {issues.map(i => {
                        const proj = projectMap[i.project_id];
                        return (
                            <tr key={i.id} className="border-t hover:bg-muted/30">
                                <td className="px-3 py-2"><Link href={`/projects/${proj?.identifier}/issues/${i.id}`} className="text-primary hover:underline">{i.id}</Link></td>
                                <td className="px-3 py-2"><Link href={`/projects/${proj?.identifier}`} className="text-primary hover:underline text-xs">{proj?.name}</Link></td>
                                <td className="px-3 py-2">{trackerMap[i.tracker_id]}</td>
                                <td className="px-3 py-2"><Link href={`/projects/${proj?.identifier}/issues/${i.id}`} className="hover:underline">{i.subject}</Link></td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{i.updated_on ? new Date(i.updated_on).toLocaleDateString() : ""}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {totalPages > 1 && (
                <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                        <Link key={p} href={`/issues?page=${p}${sp.status ? `&status=${sp.status}` : ""}`}
                            className={`px-2 py-1 rounded text-sm ${p === page ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}>{p}</Link>
                    ))}
                </div>
            )}
        </div>
    );
}
