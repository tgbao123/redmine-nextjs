import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string }> }

export default async function NewsListPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const news = await prisma.news.findMany({
        where: { project_id: project.id }, orderBy: { created_on: "desc" },
    });

    const authorIds = [...new Set(news.map(n => n.author_id).filter((id): id is number => id !== null))];
    const authors = await prisma.users.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstname: true, lastname: true, login: true } });
    const authorMap = Object.fromEntries(authors.map(a => [a.id, `${a.firstname} ${a.lastname}`.trim() || a.login]));

    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » News</h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">News</h2>
                    <Link href={`${basePath}/news/new`} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:bg-primary/90">+ Add News</Link>
                </div>
                {news.length === 0 ? (
                    <p className="text-muted-foreground">No news yet.</p>
                ) : (
                    <div className="space-y-3">
                        {news.map(n => (
                            <div key={n.id} className="border rounded-lg p-4">
                                <Link href={`${basePath}/news/${n.id}`} className="text-lg font-semibold text-primary hover:underline">{n.title}</Link>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Added by {n.author_id ? authorMap[n.author_id] || "Unknown" : "Unknown"} · {n.created_on ? new Date(n.created_on).toLocaleDateString() : ""}
                                </div>
                                {n.summary && <p className="text-sm text-muted-foreground mt-2">{n.summary}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
