import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Props { searchParams: Promise<{ [key: string]: string | undefined }> }

export default async function GlobalActivityPage({ searchParams }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");

    const sp = await searchParams;
    const days = parseInt(sp.days || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Fetch recent activity across all visible projects
    const [recentJournals, recentNews, recentMessages, recentWikiEdits] = await Promise.all([
        prisma.journals.findMany({
            where: { created_on: { gte: since }, journalized_type: "Issue" },
            orderBy: { created_on: "desc" }, take: 50,
            select: { id: true, journalized_id: true, user_id: true, notes: true, created_on: true },
        }),
        prisma.news.findMany({
            where: { created_on: { gte: since } },
            orderBy: { created_on: "desc" }, take: 20,
            select: { id: true, title: true, project_id: true, author_id: true, created_on: true },
        }),
        prisma.messages.findMany({
            where: { created_on: { gte: since }, parent_id: null },
            orderBy: { created_on: "desc" }, take: 20,
            select: { id: true, subject: true, board_id: true, author_id: true, created_on: true },
        }),
        prisma.wiki_contents.findMany({
            where: { updated_on: { gte: since } },
            orderBy: { updated_on: "desc" }, take: 20,
            select: { id: true, page_id: true, author_id: true, updated_on: true, comments: true },
        }),
    ]);

    // Fetch issues for journal entries
    const issueIds = recentJournals.map(j => j.journalized_id);
    const issues = issueIds.length > 0
        ? await prisma.issues.findMany({ where: { id: { in: issueIds } }, select: { id: true, subject: true, project_id: true } })
        : [];
    const issueMap = Object.fromEntries(issues.map(i => [i.id, i]));

    // Fetch all users
    const allUserIds = [...new Set([
        ...recentJournals.map(j => j.user_id),
        ...recentNews.map(n => n.author_id).filter(Boolean) as number[],
        ...recentMessages.map(m => m.author_id).filter(Boolean) as number[],
        ...recentWikiEdits.map(w => w.author_id).filter(Boolean) as number[],
    ])];
    const users = allUserIds.length > 0
        ? await prisma.users.findMany({ where: { id: { in: allUserIds } }, select: { id: true, firstname: true, lastname: true, login: true } })
        : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim() || u.login]));

    // Fetch projects
    const projectIds = [...new Set([
        ...issues.map(i => i.project_id),
        ...recentNews.map(n => n.project_id),
    ].filter((id): id is number => id !== null))];
    const projects = projectIds.length > 0
        ? await prisma.projects.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, identifier: true } })
        : [];
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

    // Fetch wiki pages
    const wikiPageIds = recentWikiEdits.map(w => w.page_id);
    const wikiPages = wikiPageIds.length > 0
        ? await prisma.wiki_pages.findMany({ where: { id: { in: wikiPageIds } }, select: { id: true, title: true, wiki_id: true } })
        : [];
    const wikiPageMap = Object.fromEntries(wikiPages.map(p => [p.id, p]));

    // Build activity feed
    type ActivityItem = { date: Date; type: string; html: React.ReactNode };
    const activities: ActivityItem[] = [];

    recentJournals.forEach(j => {
        const issue = issueMap[j.journalized_id];
        const proj = issue ? projectMap[issue.project_id] : null;
        if (issue && proj) {
            activities.push({
                date: j.created_on!, type: "issue",
                html: <span>{userMap[j.user_id] || "?"} updated <Link href={`/projects/${proj.identifier}/issues/${issue.id}`} className="text-blue-600 hover:underline">#{issue.id} {issue.subject}</Link> ({proj.name})</span>,
            });
        }
    });

    recentNews.forEach(n => {
        const proj = n.project_id ? projectMap[n.project_id] : null;
        if (proj) {
            activities.push({
                date: n.created_on!, type: "news",
                html: <span>{userMap[n.author_id ?? 0] || "?"} added news <Link href={`/projects/${proj.identifier}/news/${n.id}`} className="text-blue-600 hover:underline">{n.title}</Link> ({proj.name})</span>,
            });
        }
    });

    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Group by date
    const grouped: Record<string, ActivityItem[]> = {};
    activities.forEach(a => {
        const key = a.date.toLocaleDateString();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(a);
    });

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">Activity</h1>
            </div>
            <div className="px-6 py-4 max-w-4xl space-y-6">
                {Object.entries(grouped).map(([date, items]) => (
                    <div key={date}>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 border-b pb-1 mb-2">{date}</h3>
                        <div className="space-y-1.5">
                            {items.map((item, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-gray-400 text-xs mt-0.5">{item.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.type === "issue" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{item.type}</span>
                                    <span>{item.html}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {activities.length === 0 && <p className="text-gray-500 text-sm">No activity in the last {days} days.</p>}
            </div>
        </div>
    );
}
