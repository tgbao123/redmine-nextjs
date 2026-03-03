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
    const pages = wiki ? await prisma.wiki_pages.findMany({ where: { wiki_id: wiki.id }, orderBy: { title: "asc" } }) : [];
    const basePath = `/projects/${project.identifier}`;

    // If wiki has a start page, redirect to it
    if (wiki?.start_page && pages.some(p => p.title === wiki.start_page)) {
        redirect(`${basePath}/wiki/${encodeURIComponent(wiki.start_page)}`);
    }

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » Wiki</h1>
            </div>
            <div className="px-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Wiki Pages</h2>
                    <Link href={`${basePath}/wiki/new`} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:bg-primary/90">+ New Page</Link>
                </div>
                {pages.length === 0 ? (
                    <p className="text-muted-foreground">No wiki pages yet. <Link href={`${basePath}/wiki/new`} className="text-primary hover:underline">Create the first one</Link>.</p>
                ) : (
                    <ul className="space-y-1">
                        {pages.map(p => (
                            <li key={p.id}><Link href={`${basePath}/wiki/${encodeURIComponent(p.title)}`} className="text-primary hover:underline">{p.title}</Link></li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
