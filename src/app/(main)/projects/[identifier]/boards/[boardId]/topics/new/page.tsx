import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { NewTopicForm } from "./new-topic-form";

interface Props { params: Promise<{ identifier: string; boardId: string }> }

export default async function NewTopicPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier, boardId: boardIdStr } = await params;
    const boardId = parseInt(boardIdStr);
    if (isNaN(boardId)) notFound();

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const board = await prisma.boards.findFirst({ where: { id: boardId, project_id: project.id }, select: { id: true, name: true } });
    if (!board) notFound();

    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/boards/${board.id}`} className="hover:underline">{board.name}</Link> » New topic
                </h1>
            </div>
            <div className="px-6 py-4">
                <NewTopicForm projectId={project.id} projectIdentifier={project.identifier || ""} boardId={board.id} />
            </div>
        </div>
    );
}
