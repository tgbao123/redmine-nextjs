"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { revalidatePath } from "next/cache";

export async function createTopicAction(projectId: number, projectIdentifier: string, boardId: number, data: {
    subject: string; content: string;
}): Promise<{ success: boolean; topicId?: number; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.ADD_MESSAGES);
        const topic = await prisma.messages.create({
            data: {
                board_id: boardId, parent_id: null, subject: data.subject, content: data.content || "",
                author_id: user.id, created_on: new Date(), updated_on: new Date(), replies_count: 0, last_reply_id: null,
            },
        });
        // Update board counts
        await prisma.boards.update({ where: { id: boardId }, data: { topics_count: { increment: 1 }, messages_count: { increment: 1 }, last_message_id: topic.id } });
        revalidatePath(`/projects/${projectIdentifier}/boards/${boardId}`);
        return { success: true, topicId: topic.id };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function replyToTopicAction(projectId: number, projectIdentifier: string, boardId: number, topicId: number, data: {
    subject: string; content: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.ADD_MESSAGES);
        const reply = await prisma.messages.create({
            data: {
                board_id: boardId, parent_id: topicId, subject: data.subject, content: data.content || "",
                author_id: user.id, created_on: new Date(), updated_on: new Date(), replies_count: 0, last_reply_id: null,
            },
        });
        // Update topic + board counts
        await prisma.messages.update({ where: { id: topicId }, data: { replies_count: { increment: 1 }, last_reply_id: reply.id, updated_on: new Date() } });
        await prisma.boards.update({ where: { id: boardId }, data: { messages_count: { increment: 1 }, last_message_id: reply.id } });
        revalidatePath(`/projects/${projectIdentifier}/boards/${boardId}/topics/${topicId}`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateMessageAction(projectId: number, projectIdentifier: string, boardId: number, topicId: number, messageId: number, data: {
    subject?: string; content?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.EDIT_MESSAGES);
        await prisma.messages.update({ where: { id: messageId }, data: { ...data, updated_on: new Date() } });
        revalidatePath(`/projects/${projectIdentifier}/boards/${boardId}/topics/${topicId}`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteMessageAction(projectId: number, projectIdentifier: string, boardId: number, topicId: number, messageId: number): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.DELETE_MESSAGES);
        const msg = await prisma.messages.findFirst({ where: { id: messageId } });
        if (!msg) return { success: false, error: "Not found" };
        // If deleting a topic, delete all replies too
        if (msg.parent_id === null) {
            const replyCount = await prisma.messages.count({ where: { parent_id: messageId } });
            await prisma.messages.deleteMany({ where: { parent_id: messageId } });
            await prisma.messages.delete({ where: { id: messageId } });
            await prisma.boards.update({ where: { id: boardId }, data: { topics_count: { decrement: 1 }, messages_count: { decrement: 1 + replyCount } } });
        } else {
            await prisma.messages.delete({ where: { id: messageId } });
            await prisma.messages.update({ where: { id: topicId }, data: { replies_count: { decrement: 1 } } });
            await prisma.boards.update({ where: { id: boardId }, data: { messages_count: { decrement: 1 } } });
        }
        revalidatePath(`/projects/${projectIdentifier}/boards/${boardId}`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function toggleStickyAction(messageId: number): Promise<{ success: boolean; error?: string }> {
    try {
        const msg = await prisma.messages.findFirst({ where: { id: messageId }, select: { sticky: true } });
        if (!msg) return { success: false, error: "Not found" };
        await prisma.messages.update({ where: { id: messageId }, data: { sticky: msg.sticky ? 0 : 1 } });
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function toggleLockedAction(messageId: number): Promise<{ success: boolean; error?: string }> {
    try {
        const msg = await prisma.messages.findFirst({ where: { id: messageId }, select: { locked: true } });
        if (!msg) return { success: false, error: "Not found" };
        await prisma.messages.update({ where: { id: messageId }, data: { locked: !msg.locked } });
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}
