import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Props { searchParams: Promise<{ q?: string; scope?: string }> }
type SearchResult = { type: string; id: number; title: string; description: string; projectName: string; projectIdentifier: string; date: string; url: string };

export default async function SearchPage({ searchParams }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { q = "", scope = "all" } = await searchParams;

    let results: SearchResult[] = [];

    if (q.trim()) {
        const term = `%${q.trim()}%`;

        // Accessible projects
        let projectIds: number[];
        if (user.admin) {
            projectIds = (await prisma.projects.findMany({ where: { status: 1 }, select: { id: true } })).map(p => p.id);
        } else {
            const [memberships, publicProjects] = await Promise.all([
                prisma.members.findMany({ where: { user_id: user.id }, select: { project_id: true } }),
                prisma.projects.findMany({ where: { status: 1, is_public: true }, select: { id: true } }),
            ]);
            projectIds = [...new Set([...memberships.map(m => m.project_id), ...publicProjects.map(p => p.id)])];
        }
        if (projectIds.length === 0) projectIds = [0];

        const projectMap = Object.fromEntries((await prisma.projects.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, identifier: true } })).map(p => [p.id, p]));

        // Search issues
        if (scope === "all" || scope === "issues") {
            const issues = await prisma.$queryRawUnsafe<any[]>(
                `SELECT id, subject, description, project_id, created_on FROM issues WHERE project_id IN (${projectIds.join(",")}) AND (subject LIKE ? OR description LIKE ?) ORDER BY updated_on DESC LIMIT 20`,
                term, term
            );
            results.push(...issues.map((i: any) => ({
                type: "Issue", id: i.id, title: `#${i.id} ${i.subject}`,
                description: (i.description || "").substring(0, 150),
                projectName: projectMap[i.project_id]?.name || "", projectIdentifier: projectMap[i.project_id]?.identifier || "",
                date: i.created_on ? new Date(i.created_on).toLocaleDateString() : "",
                url: `/projects/${projectMap[i.project_id]?.identifier || ""}/issues/${i.id}`,
            })));
        }

        // Search news
        if (scope === "all" || scope === "news") {
            const news = await prisma.$queryRawUnsafe<any[]>(
                `SELECT id, title, description, project_id, created_on FROM news WHERE project_id IN (${projectIds.join(",")}) AND (title LIKE ? OR description LIKE ?) ORDER BY created_on DESC LIMIT 10`,
                term, term
            );
            results.push(...news.map((n: any) => ({
                type: "News", id: n.id, title: n.title,
                description: (n.description || "").substring(0, 150),
                projectName: projectMap[n.project_id]?.name || "", projectIdentifier: projectMap[n.project_id]?.identifier || "",
                date: n.created_on ? new Date(n.created_on).toLocaleDateString() : "",
                url: `/projects/${projectMap[n.project_id]?.identifier || ""}/news/${n.id}`,
            })));
        }

        // Search wiki pages
        if (scope === "all" || scope === "wiki") {
            const wikiPages = await prisma.$queryRawUnsafe<any[]>(
                `SELECT wp.id, wp.title, wc.text, w.project_id, wc.updated_on FROM wiki_pages wp JOIN wiki_contents wc ON wc.page_id = wp.id JOIN wikis w ON w.id = wp.wiki_id WHERE w.project_id IN (${projectIds.join(",")}) AND (wp.title LIKE ? OR wc.text LIKE ?) ORDER BY wc.updated_on DESC LIMIT 10`,
                term, term
            );
            results.push(...wikiPages.map((wp: any) => ({
                type: "Wiki", id: wp.id, title: wp.title,
                description: (wp.text || "").substring(0, 150),
                projectName: projectMap[wp.project_id]?.name || "", projectIdentifier: projectMap[wp.project_id]?.identifier || "",
                date: wp.updated_on ? new Date(wp.updated_on).toLocaleDateString() : "",
                url: `/projects/${projectMap[wp.project_id]?.identifier || ""}/wiki/${encodeURIComponent(wp.title)}`,
            })));
        }

        // Search forum messages
        if (scope === "all" || scope === "forums") {
            const messages = await prisma.$queryRawUnsafe<any[]>(
                `SELECT m.id, m.subject, m.content, m.board_id, m.parent_id, m.created_on, b.project_id FROM messages m JOIN boards b ON b.id = m.board_id WHERE b.project_id IN (${projectIds.join(",")}) AND (m.subject LIKE ? OR m.content LIKE ?) ORDER BY m.created_on DESC LIMIT 10`,
                term, term
            );
            results.push(...messages.map((m: any) => ({
                type: "Forum", id: m.id, title: m.subject,
                description: (m.content || "").substring(0, 150),
                projectName: projectMap[m.project_id]?.name || "", projectIdentifier: projectMap[m.project_id]?.identifier || "",
                date: m.created_on ? new Date(m.created_on).toLocaleDateString() : "",
                url: `/projects/${projectMap[m.project_id]?.identifier || ""}/boards/${m.board_id}/topics/${m.parent_id || m.id}`,
            })));
        }
    }

    // Group results by type
    const grouped: Record<string, SearchResult[]> = {};
    for (const r of results) {
        (grouped[r.type] ||= []).push(r);
    }
    const typeColors: Record<string, string> = { Issue: "bg-blue-100 text-blue-700", News: "bg-green-100 text-green-700", Wiki: "bg-purple-100 text-purple-700", Forum: "bg-orange-100 text-orange-700" };

    return (
        <div className="space-y-4 p-6 max-w-4xl">
            <h1 className="text-2xl font-bold">Search</h1>
            <form className="flex gap-2">
                <input name="q" defaultValue={q} placeholder="Search…" className="border rounded px-3 py-2 text-sm flex-1" />
                <select name="scope" defaultValue={scope} className="border rounded px-2 py-1 text-sm">
                    <option value="all">All</option>
                    <option value="issues">Issues</option>
                    <option value="news">News</option>
                    <option value="wiki">Wiki</option>
                    <option value="forums">Forums</option>
                </select>
                <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm">Search</button>
            </form>
            {q && <div className="text-sm text-muted-foreground">{results.length} results for &quot;{q}&quot;</div>}
            {Object.entries(grouped).map(([type, items]) => (
                <div key={type} className="space-y-2">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${typeColors[type] || "bg-gray-100"}`}>{type}</span>
                        <span className="text-muted-foreground">({items.length})</span>
                    </h2>
                    {items.map((r, i) => (
                        <div key={`${r.type}-${r.id}-${i}`} className="border rounded p-3 ml-2">
                            <Link href={r.url} className="font-medium text-primary hover:underline">{r.title}</Link>
                            {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                            <div className="text-xs text-muted-foreground mt-1">{r.projectName} · {r.date}</div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

