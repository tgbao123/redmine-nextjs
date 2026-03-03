import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ identifier: string }> }

export default async function DocumentsPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const documents = await prisma.documents.findMany({
        where: { project_id: project.id }, orderBy: { created_on: "desc" },
    });

    const categories = await prisma.enumerations.findMany({
        where: { type: "DocumentCategory", active: true }, select: { id: true, name: true }, orderBy: { position: "asc" },
    });
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    const basePath = `/projects/${project.identifier}`;
    const grouped = categories.map(c => ({ ...c, docs: documents.filter(d => d.category_id === c.id) })).filter(g => g.docs.length > 0);

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » Documents</h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <h2 className="text-xl font-bold">Documents</h2>
                {grouped.length === 0 ? (
                    <p className="text-muted-foreground">No documents yet.</p>
                ) : (
                    grouped.map(g => (
                        <div key={g.id}>
                            <h3 className="font-semibold text-sm text-muted-foreground mb-2">{g.name}</h3>
                            <div className="space-y-2 mb-4">
                                {g.docs.map(d => (
                                    <div key={d.id} className="border rounded p-3">
                                        <span className="font-medium">{d.title}</span>
                                        {d.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
                                        <div className="text-xs text-muted-foreground mt-1">{d.created_on ? new Date(d.created_on).toLocaleDateString() : ""}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
