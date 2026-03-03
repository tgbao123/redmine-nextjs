import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { WikiPage } from "./wiki-page";
import { getUserPermissions } from "@/lib/permissions";

interface Props { params: Promise<{ identifier: string; title: string }> }

export default async function WikiPageView({ params }: Props) {
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

    const [content, permissions] = await Promise.all([
        prisma.wiki_contents.findFirst({ where: { page_id: page.id } }),
        getUserPermissions(user.id, project.id, user.admin),
    ]);

    const author = content?.author_id ? await prisma.users.findFirst({ where: { id: content.author_id }, select: { firstname: true, lastname: true, login: true } }) : null;

    return (
        <WikiPage
            project={project}
            page={{ id: page.id, title: page.title, createdOn: page.created_on?.toISOString() || "" }}
            content={{ text: content?.text || "", version: content?.version || 1, updatedOn: content?.updated_on?.toISOString() || "", author: author ? `${author.firstname} ${author.lastname}`.trim() || author.login : "Unknown" }}
            permissions={Array.from(permissions)}
        />
    );
}
