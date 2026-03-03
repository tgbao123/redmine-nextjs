import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { NewsDetail } from "./news-detail";

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

    const [author, comments] = await Promise.all([
        news.author_id
            ? prisma.users.findFirst({ where: { id: news.author_id }, select: { id: true, firstname: true, lastname: true, login: true } })
            : null,
        prisma.comments.findMany({
            where: { commented_type: "News", commented_id: newsId },
            orderBy: { created_on: "asc" },
        }),
    ]);

    // Fetch comment authors
    const commentAuthorIds = [...new Set(comments.map(c => c.author_id).filter(Boolean))] as number[];
    const commentAuthors = commentAuthorIds.length > 0
        ? await prisma.users.findMany({ where: { id: { in: commentAuthorIds } }, select: { id: true, firstname: true, lastname: true, login: true } })
        : [];
    const authorMap = Object.fromEntries(commentAuthors.map(a => [a.id, `${a.firstname} ${a.lastname}`.trim() || a.login]));

    const authorName = author ? `${author.firstname} ${author.lastname}`.trim() || author.login : "Unknown";
    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/news`} className="hover:underline">News</Link></h1>
            </div>
            <div className="px-6 py-4">
                <NewsDetail
                    projectId={project.id}
                    projectIdentifier={project.identifier || ""}
                    news={{ id: news.id, title: news.title, summary: news.summary || "", description: news.description || "", authorName, createdOn: news.created_on?.toISOString() || "" }}
                    comments={comments.map(c => ({ id: c.id, content: c.comments || "", authorName: authorMap[c.author_id] || "Unknown", createdOn: c.created_on?.toISOString() || "" }))}
                    isAdmin={user.admin}
                />
            </div>
        </div>
    );
}
