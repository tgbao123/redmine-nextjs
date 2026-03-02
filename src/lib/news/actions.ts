"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { revalidatePath } from "next/cache";

export async function createNewsAction(projectId: number, projectIdentifier: string, data: {
    title: string; summary?: string; description?: string;
}): Promise<{ success: boolean; newsId?: number; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.MANAGE_NEWS);
        const news = await prisma.news.create({
            data: {
                project_id: projectId, title: data.title,
                summary: data.summary || "", description: data.description || "",
                author_id: user.id, created_on: new Date(),
                comments_count: 0,
            },
        });
        revalidatePath(`/projects/${projectIdentifier}/news`);
        return { success: true, newsId: news.id };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateNewsAction(projectId: number, projectIdentifier: string, newsId: number, data: {
    title?: string; summary?: string; description?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.MANAGE_NEWS);
        await prisma.news.update({ where: { id: newsId }, data });
        revalidatePath(`/projects/${projectIdentifier}/news`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteNewsAction(projectId: number, projectIdentifier: string, newsId: number): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.MANAGE_NEWS);
        await prisma.news.delete({ where: { id: newsId } });
        revalidatePath(`/projects/${projectIdentifier}/news`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}
