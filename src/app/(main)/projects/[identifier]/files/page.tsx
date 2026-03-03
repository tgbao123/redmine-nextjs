import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string }> }

export default async function FilesPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    // Get versions with attachments
    const versions = await prisma.versions.findMany({
        where: { project_id: project.id },
        orderBy: [{ effective_date: "desc" }, { name: "asc" }],
        select: { id: true, name: true },
    });

    // Get all file attachments for this project (from versions and documents)
    const versionIds = versions.map(v => v.id);
    const [versionFiles, documentFiles] = await Promise.all([
        versionIds.length > 0
            ? prisma.attachments.findMany({
                where: { container_type: "Version", container_id: { in: versionIds } },
                orderBy: { created_on: "desc" },
            })
            : [],
        prisma.attachments.findMany({
            where: { container_type: "Document", container_id: { in: (await prisma.documents.findMany({ where: { project_id: project.id }, select: { id: true } })).map(d => d.id) } },
            orderBy: { created_on: "desc" },
        }),
    ]);

    // Fetch authors
    const authorIds = [...new Set([...versionFiles, ...documentFiles].map(f => f.author_id).filter(Boolean))] as number[];
    const authors = authorIds.length > 0
        ? await prisma.users.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstname: true, lastname: true, login: true } })
        : [];
    const authorMap = Object.fromEntries(authors.map(a => [a.id, `${a.firstname} ${a.lastname}`.trim() || a.login]));

    const versionMap = Object.fromEntries(versions.map(v => [v.id, v.name]));
    const basePath = `/projects/${project.identifier}`;

    const allFiles = [
        ...versionFiles.map(f => ({ ...f, group: f.container_id ? (versionMap[f.container_id] || "Unknown version") : "Unknown version", groupType: "Version" as const })),
        ...documentFiles.map(f => ({ ...f, group: "Documents", groupType: "Document" as const })),
    ];

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » Files
                </h1>
            </div>
            <div className="px-6 py-4">
                {allFiles.length === 0 ? (
                    <p className="text-gray-500 text-sm">No files have been uploaded yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 font-medium">File</th>
                                <th className="text-left py-2 font-medium">Date</th>
                                <th className="text-left py-2 font-medium">Size</th>
                                <th className="text-left py-2 font-medium">D/L</th>
                                <th className="text-left py-2 font-medium">Author</th>
                                <th className="text-left py-2 font-medium">Group</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allFiles.map(f => (
                                <tr key={f.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="py-2">
                                        <Link href={`/api/attachments/${f.id}`} className="text-blue-600 hover:underline">{f.filename}</Link>
                                    </td>
                                    <td className="py-2 text-gray-500">{f.created_on ? new Date(f.created_on).toLocaleDateString() : ""}</td>
                                    <td className="py-2 text-gray-500">{f.filesize ? `${(Number(f.filesize) / 1024).toFixed(1)} KB` : ""}</td>
                                    <td className="py-2 text-gray-500">{f.downloads}</td>
                                    <td className="py-2 text-gray-500">{f.author_id ? authorMap[f.author_id] || "" : ""}</td>
                                    <td className="py-2 text-gray-500">{f.group}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
