import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string }> }

export default async function BoardsPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const boards = await prisma.boards.findMany({
        where: { project_id: project.id }, orderBy: { position: "asc" },
    });

    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » Forums</h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <h2 className="text-xl font-bold">Forums</h2>
                {boards.length === 0 ? (
                    <p className="text-muted-foreground">No forums yet.</p>
                ) : (
                    <table className="w-full text-sm border rounded">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr><th className="text-left px-3 py-2">Forum</th><th className="text-left px-3 py-2">Description</th><th className="text-left px-3 py-2">Topics</th><th className="text-left px-3 py-2">Posts</th></tr>
                        </thead>
                        <tbody>
                            {boards.map(b => (
                                <tr key={b.id} className="border-t">
                                    <td className="px-3 py-2"><Link href={`${basePath}/boards/${b.id}`} className="text-primary hover:underline font-medium">{b.name}</Link></td>
                                    <td className="px-3 py-2 text-muted-foreground">{b.description || ""}</td>
                                    <td className="px-3 py-2">{b.topics_count || 0}</td>
                                    <td className="px-3 py-2">{b.messages_count || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
