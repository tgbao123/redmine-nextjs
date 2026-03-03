"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function createGroupAction(name: string): Promise<{ success: boolean; error?: string }> {
    const user = await getSession();
    if (!user?.admin) return { success: false, error: "Admin only" };

    try {
        await prisma.users.create({
            data: { login: "", hashed_password: "", firstname: "", lastname: name, type: "Group", status: 1, created_on: new Date(), updated_on: new Date() },
        });
        revalidatePath("/admin/groups");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteGroupAction(groupId: number): Promise<{ success: boolean; error?: string }> {
    const user = await getSession();
    if (!user?.admin) return { success: false, error: "Admin only" };

    try {
        await prisma.groups_users.deleteMany({ where: { group_id: groupId } });
        await prisma.members.deleteMany({ where: { user_id: groupId } });
        await prisma.users.delete({ where: { id: groupId } });
        revalidatePath("/admin/groups");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function addUserToGroupAction(groupId: number, userId: number): Promise<{ success: boolean; error?: string }> {
    const user = await getSession();
    if (!user?.admin) return { success: false, error: "Admin only" };

    const existing = await prisma.groups_users.findFirst({ where: { group_id: groupId, user_id: userId } });
    if (existing) return { success: false, error: "Already in group" };

    try {
        await prisma.groups_users.create({ data: { group_id: groupId, user_id: userId } });
        revalidatePath("/admin/groups");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function removeUserFromGroupAction(groupId: number, userId: number): Promise<{ success: boolean; error?: string }> {
    const user = await getSession();
    if (!user?.admin) return { success: false, error: "Admin only" };

    try {
        await prisma.groups_users.deleteMany({ where: { group_id: groupId, user_id: userId } });
        revalidatePath("/admin/groups");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}
