"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { revalidatePath } from "next/cache";

export async function createTimeEntryAction(data: {
    projectId: number; issueId?: number | null; hours: number;
    activityId: number; spentOn: string; comments?: string;
    projectIdentifier: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requirePermission(data.projectId, Permission.LOG_TIME);
        await prisma.time_entries.create({
            data: {
                project_id: data.projectId, issue_id: data.issueId || null,
                user_id: user.id, hours: data.hours, activity_id: data.activityId,
                spent_on: new Date(data.spentOn), comments: data.comments || "",
                tyear: new Date(data.spentOn).getFullYear(),
                tmonth: new Date(data.spentOn).getMonth() + 1,
                tweek: getWeekNumber(new Date(data.spentOn)),
                created_on: new Date(), updated_on: new Date(),
            },
        });
        revalidatePath(`/projects/${data.projectIdentifier}/time_entries`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateTimeEntryAction(id: number, projectId: number, data: {
    hours?: number; activityId?: number; spentOn?: string; comments?: string;
    projectIdentifier: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.EDIT_TIME_ENTRIES);
        const updateData: any = { updated_on: new Date() };
        if (data.hours !== undefined) updateData.hours = data.hours;
        if (data.activityId !== undefined) updateData.activity_id = data.activityId;
        if (data.comments !== undefined) updateData.comments = data.comments;
        if (data.spentOn) {
            updateData.spent_on = new Date(data.spentOn);
            updateData.tyear = new Date(data.spentOn).getFullYear();
            updateData.tmonth = new Date(data.spentOn).getMonth() + 1;
            updateData.tweek = getWeekNumber(new Date(data.spentOn));
        }
        await prisma.time_entries.update({ where: { id }, data: updateData });
        revalidatePath(`/projects/${data.projectIdentifier}/time_entries`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteTimeEntryAction(id: number, projectId: number, projectIdentifier: string): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.EDIT_TIME_ENTRIES);
        await prisma.time_entries.delete({ where: { id } });
        revalidatePath(`/projects/${projectIdentifier}/time_entries`);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

function getWeekNumber(d: Date): number {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}
