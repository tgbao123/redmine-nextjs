import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { ThreadView } from "./thread-view";

interface Props { params: Promise<{ identifier: string; boardId: string; id: string }> }

export default async function TopicPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier, boardId: bId, id } = await params;
    const boardId = parseInt(bId);
    const topicId = parseInt(id);
    if (isNaN(boardId) || isNaN(topicId)) notFound();

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const board = await prisma.boards.findFirst({ where: { id: boardId, project_id: project.id } });
    if (!board) notFound();

    const topic = await prisma.messages.findFirst({ where: { id: topicId, board_id: boardId, parent_id: null } });
    if (!topic) notFound();

    const replies = await prisma.messages.findMany({ where: { parent_id: topicId }, orderBy: { created_on: "asc" } });

    const allMessages = [topic, ...replies];
    const authorIds = [...new Set(allMessages.map(m => m.author_id).filter((id): id is number => id !== null))];
    const authors = await prisma.users.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstname: true, lastname: true, login: true } });
    const authorMap = Object.fromEntries(authors.map(a => [a.id, `${a.firstname} ${a.lastname}`.trim() || a.login]));

    const topicData = { id: topic.id, subject: topic.subject, content: topic.content || "", author: authorMap[topic.author_id || 0] || "Unknown", createdOn: topic.created_on?.toISOString() || "" };
    const replyData = replies.map(r => ({ id: r.id, subject: r.subject, content: r.content || "", author: authorMap[r.author_id || 0] || "Unknown", createdOn: r.created_on?.toISOString() || "" }));

    return <ThreadView project={project} board={{ id: board.id, name: board.name }} topic={topicData} replies={replyData} />;
}
