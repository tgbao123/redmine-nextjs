import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string; title: string }> }

export default async function WikiHistoryPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier, title } = await params;
    const decodedTitle = decodeURIComponent(title);

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const wiki = await prisma.wikis.findFirst({ where: { project_id: project.id } });
    if (!wiki) notFound();
    const page = await prisma.wiki_pages.findFirst({ where: { wiki_id: wiki.id, title: decodedTitle } });
    if (!page) notFound();

    const versions = await prisma.wiki_content_versions.findMany({
        where: { page_id: page.id }, orderBy: { version: "desc" },
    });

    const authorIds = [...new Set(versions.map(v => v.author_id).filter((id): id is number => id !== null))];
    const authors = await prisma.users.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstname: true, lastname: true, login: true } });
    const authorMap = Object.fromEntries(authors.map(a => [a.id, `${a.firstname} ${a.lastname}`.trim() || a.login]));

    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/wiki`} className="hover:underline">Wiki</Link> » <Link href={`${basePath}/wiki/${encodeURIComponent(decodedTitle)}`} className="hover:underline">{decodedTitle}</Link> » History
                </h1>
            </div>
            <div className="px-6 py-4">
                <h2 className="text-xl font-bold mb-4">History of {decodedTitle}</h2>
                <table className="w-full text-sm border rounded">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Author</th><th className="text-left px-3 py-2">Comment</th></tr>
                    </thead>
                    <tbody>
                        {versions.map(v => (
                            <tr key={v.id} className="border-t">
                                <td className="px-3 py-2 font-medium">{v.version}</td>
                                <td className="px-3 py-2 text-muted-foreground">{v.updated_on ? new Date(v.updated_on).toLocaleString() : ""}</td>
                                <td className="px-3 py-2">{v.author_id ? authorMap[v.author_id] || "Unknown" : "Unknown"}</td>
                                <td className="px-3 py-2 text-muted-foreground">{v.comments || ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
