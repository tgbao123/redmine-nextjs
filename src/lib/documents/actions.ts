"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { revalidatePath } from "next/cache";

export async function createDocumentAction(projectId: number, projectIdentifier: string, data: {
    title: string; description?: string; categoryId?: number;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.ADD_DOCUMENTS);
        await prisma.documents.create({
            data: {
                project_id: projectId, title: data.title,
                description: data.description || "", category_id: data.categoryId || 0,
                created_on: new Date(),
            },
        });
        revalidatePath(`/projects/${projectIdentifier}/documents`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateDocumentAction(projectId: number, projectIdentifier: string, docId: number, data: {
    title?: string; description?: string; categoryId?: number;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.EDIT_DOCUMENTS);
        await prisma.documents.update({
            where: { id: docId },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.categoryId !== undefined && { category_id: data.categoryId }),
            },
        });
        revalidatePath(`/projects/${projectIdentifier}/documents`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteDocumentAction(projectId: number, projectIdentifier: string, docId: number): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.DELETE_DOCUMENTS);
        await prisma.attachments.deleteMany({ where: { container_type: "Document", container_id: docId } });
        await prisma.documents.delete({ where: { id: docId } });
        revalidatePath(`/projects/${projectIdentifier}/documents`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}
