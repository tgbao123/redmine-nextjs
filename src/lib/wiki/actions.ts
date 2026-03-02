"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { revalidatePath } from "next/cache";

export async function createWikiPageAction(projectId: number, projectIdentifier: string, data: {
    title: string; content: string; comment?: string; parentTitle?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.EDIT_WIKI_PAGES);
        // Find or create wiki for project
        let wiki = await prisma.wikis.findFirst({ where: { project_id: projectId } });
        if (!wiki) {
            wiki = await prisma.wikis.create({ data: { project_id: projectId, start_page: "Wiki", status: 1 } });
        }

        // Check if page exists
        const existing = await prisma.wiki_pages.findFirst({ where: { wiki_id: wiki.id, title: data.title } });
        if (existing) return { success: false, error: "A page with this title already exists" };

        // Create page
        const page = await prisma.wiki_pages.create({
            data: { wiki_id: wiki.id, title: data.title, created_on: new Date(), protected: false },
        });

        // Create content
        await prisma.wiki_contents.create({
            data: { page_id: page.id, author_id: user.id, text: data.content, version: 1, updated_on: new Date(), comments: data.comment || "" },
        });

        // Create version
        await prisma.wiki_content_versions.create({
            data: { wiki_content_id: page.id, page_id: page.id, author_id: user.id, data: data.content, version: 1, updated_on: new Date(), comments: data.comment || "", compression: "" },
        });

        revalidatePath(`/projects/${projectIdentifier}/wiki`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateWikiPageAction(projectId: number, projectIdentifier: string, pageId: number, data: {
    content: string; comment?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.EDIT_WIKI_PAGES);
        const content = await prisma.wiki_contents.findFirst({ where: { page_id: pageId } });
        if (!content) return { success: false, error: "Content not found" };

        const newVersion = (content.version || 0) + 1;

        // Save current version to history
        await prisma.wiki_content_versions.create({
            data: { wiki_content_id: content.id, page_id: pageId, author_id: user.id, data: data.content, version: newVersion, updated_on: new Date(), comments: data.comment || "", compression: "" },
        });

        // Update current content
        await prisma.wiki_contents.update({
            where: { id: content.id },
            data: { text: data.content, author_id: user.id, version: newVersion, updated_on: new Date(), comments: data.comment || "" },
        });

        revalidatePath(`/projects/${projectIdentifier}/wiki`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteWikiPageAction(projectId: number, projectIdentifier: string, pageId: number): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.DELETE_WIKI_PAGES);
        await prisma.wiki_content_versions.deleteMany({ where: { page_id: pageId } });
        await prisma.wiki_contents.deleteMany({ where: { page_id: pageId } });
        await prisma.wiki_pages.delete({ where: { id: pageId } });
        revalidatePath(`/projects/${projectIdentifier}/wiki`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}
