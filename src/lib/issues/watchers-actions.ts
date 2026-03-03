"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function watchAction(watchableType: string, watchableId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    const existing = await prisma.watchers.findFirst({
        where: { watchable_type: watchableType, watchable_id: watchableId, user_id: user.id },
    });

    if (existing) return { success: true, watching: true }; // Already watching

    try {
        await prisma.watchers.create({
            data: { watchable_type: watchableType, watchable_id: watchableId, user_id: user.id },
        });
        return { success: true, watching: true };
    } catch (error) {
        console.error("Watch error:", error);
        return { error: "Failed to watch" };
    }
}

export async function unwatchAction(watchableType: string, watchableId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.watchers.deleteMany({
            where: { watchable_type: watchableType, watchable_id: watchableId, user_id: user.id },
        });
        return { success: true, watching: false };
    } catch (error) {
        console.error("Unwatch error:", error);
        return { error: "Failed to unwatch" };
    }
}

export async function addWatcherAction(watchableType: string, watchableId: number, userId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    const existing = await prisma.watchers.findFirst({
        where: { watchable_type: watchableType, watchable_id: watchableId, user_id: userId },
    });
    if (existing) return { error: "Already watching" };

    try {
        await prisma.watchers.create({
            data: { watchable_type: watchableType, watchable_id: watchableId, user_id: userId },
        });
        return { success: true };
    } catch (error) {
        console.error("Add watcher error:", error);
        return { error: "Failed to add watcher" };
    }
}

export async function removeWatcherAction(watchableType: string, watchableId: number, userId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.watchers.deleteMany({
            where: { watchable_type: watchableType, watchable_id: watchableId, user_id: userId },
        });
        return { success: true };
    } catch (error) {
        console.error("Remove watcher error:", error);
        return { error: "Failed to remove watcher" };
    }
}
