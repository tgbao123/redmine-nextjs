import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string; id: string }> }

export default async function NewsDetailPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier, id } = await params;
    const newsId = parseInt(id);
    if (isNaN(newsId)) notFound();

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const news = await prisma.news.findFirst({ where: { id: newsId, project_id: project.id } });
    if (!news) notFound();

    const author = news.author_id
        ? await prisma.users.findFirst({ where: { id: news.author_id }, select: { firstname: true, lastname: true, login: true } })
        : null;
    const authorName = author ? `${author.firstname} ${author.lastname}`.trim() || author.login : "Unknown";

    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/news`} className="hover:underline">News</Link></h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <h2 className="text-2xl font-bold">{news.title}</h2>
                <div className="text-sm text-muted-foreground">Added by {authorName} · {news.created_on ? new Date(news.created_on).toLocaleDateString() : ""}</div>
                {news.summary && <p className="text-sm text-muted-foreground italic">{news.summary}</p>}
                {news.description && (
                    <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">{news.description}</div>
                )}
            </div>
        </div>
    );
}
