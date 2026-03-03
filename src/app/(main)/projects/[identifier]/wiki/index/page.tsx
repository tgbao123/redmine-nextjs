import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string }> }

export default async function WikiIndexPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const wiki = await prisma.wikis.findFirst({ where: { project_id: project.id } });
    if (!wiki) notFound();

    const pages = await prisma.wiki_pages.findMany({
        where: { wiki_id: wiki.id },
        orderBy: { title: "asc" },
    });

    // Get content update dates
    const pageIds = pages.map(p => p.id);
    const contents = pageIds.length > 0
        ? await prisma.wiki_contents.findMany({
            where: { page_id: { in: pageIds } },
            select: { page_id: true, updated_on: true, author_id: true },
        })
        : [];
    const contentMap = Object.fromEntries(contents.map(c => [c.page_id, c]));

    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/wiki`} className="hover:underline">Wiki</Link> » Index
                </h1>
            </div>
            <div className="px-6 py-4">
                <h2 className="text-lg font-bold mb-4">Wiki pages ({pages.length})</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2 font-medium">Title</th>
                            <th className="text-left py-2 font-medium">Last updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pages.map(page => (
                            <tr key={page.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="py-2">
                                    <Link href={`${basePath}/wiki/${page.title}`} className="text-blue-600 hover:underline">{page.title}</Link>
                                </td>
                                <td className="py-2 text-gray-500">
                                    {contentMap[page.id]?.updated_on ? new Date(contentMap[page.id].updated_on).toLocaleDateString() : ""}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
