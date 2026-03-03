import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string; boardId: string }> }

export default async function BoardDetailPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier, boardId: bId } = await params;
    const boardId = parseInt(bId);
    if (isNaN(boardId)) notFound();

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const board = await prisma.boards.findFirst({ where: { id: boardId, project_id: project.id } });
    if (!board) notFound();

    // Topics are messages with parent_id = null
    const topics = await prisma.messages.findMany({
        where: { board_id: boardId, parent_id: null }, orderBy: { created_on: "desc" }, take: 50,
    });

    const authorIds = [...new Set(topics.map(t => t.author_id).filter((id): id is number => id !== null))];
    const authors = await prisma.users.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstname: true, lastname: true, login: true } });
    const authorMap = Object.fromEntries(authors.map(a => [a.id, `${a.firstname} ${a.lastname}`.trim() || a.login]));

    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/boards`} className="hover:underline">Forums</Link> » {board.name}
                </h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                {board.description && <p className="text-muted-foreground text-sm">{board.description}</p>}
                {topics.length === 0 ? (
                    <p className="text-muted-foreground">No topics yet.</p>
                ) : (
                    <table className="w-full text-sm border rounded">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr><th className="text-left px-3 py-2">Topic</th><th className="text-left px-3 py-2">Author</th><th className="text-left px-3 py-2">Replies</th><th className="text-left px-3 py-2">Date</th></tr>
                        </thead>
                        <tbody>
                            {topics.map(t => (
                                <tr key={t.id} className="border-t">
                                    <td className="px-3 py-2"><Link href={`${basePath}/boards/${boardId}/topics/${t.id}`} className="text-primary hover:underline">{t.subject}</Link></td>
                                    <td className="px-3 py-2">{t.author_id ? authorMap[t.author_id] || "Unknown" : "Unknown"}</td>
                                    <td className="px-3 py-2">{t.replies_count || 0}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{t.created_on ? new Date(t.created_on).toLocaleDateString() : ""}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
