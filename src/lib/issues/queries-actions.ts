"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function saveQueryAction(projectId: number | null, data: {
    name: string; isPublic?: boolean; filters: string; columnNames?: string; sortCriteria?: string; groupBy?: string;
}): Promise<{ success: boolean; queryId?: number; error?: string }> {
    const user = await getSession();
    if (!user) return { success: false, error: "Not authenticated" };

    try {
        const query = await prisma.queries.create({
            data: {
                project_id: projectId, name: data.name,
                filters: data.filters || "", column_names: data.columnNames || "",
                sort_criteria: data.sortCriteria || "", group_by: data.groupBy || "",
                user_id: user.id, visibility: data.isPublic ? 2 : 0,
                type: "", options: "",
            },
        });
        return { success: true, queryId: query.id };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateQueryAction(queryId: number, data: {
    name?: string; isPublic?: boolean; filters?: string; columnNames?: string; sortCriteria?: string; groupBy?: string;
}): Promise<{ success: boolean; error?: string }> {
    const user = await getSession();
    if (!user) return { success: false, error: "Not authenticated" };

    const query = await prisma.queries.findFirst({ where: { id: queryId } });
    if (!query) return { success: false, error: "Not found" };
    if (query.user_id !== user.id && !user.admin) return { success: false, error: "Permission denied" };

    try {
        await prisma.queries.update({
            where: { id: queryId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.filters !== undefined && { filters: data.filters }),
                ...(data.columnNames !== undefined && { column_names: data.columnNames }),
                ...(data.sortCriteria !== undefined && { sort_criteria: data.sortCriteria }),
                ...(data.groupBy !== undefined && { group_by: data.groupBy }),
                ...(data.isPublic !== undefined && { visibility: data.isPublic ? 2 : 0 }),
            },
        });
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteQueryAction(queryId: number): Promise<{ success: boolean; error?: string }> {
    const user = await getSession();
    if (!user) return { success: false, error: "Not authenticated" };

    const query = await prisma.queries.findFirst({ where: { id: queryId } });
    if (!query) return { success: false, error: "Not found" };
    if (query.user_id !== user.id && !user.admin) return { success: false, error: "Permission denied" };

    try {
        await prisma.queries.delete({ where: { id: queryId } });
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function getQueriesAction(projectId: number | null): Promise<{ id: number; name: string; isPublic: boolean; userId: number }[]> {
    const user = await getSession();
    if (!user) return [];

    const queries = await prisma.queries.findMany({
        where: {
            OR: [
                { user_id: user.id },
                { visibility: 2 },
            ],
            ...(projectId !== null ? { OR: [{ project_id: projectId }, { project_id: null }] } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, visibility: true, user_id: true },
    });

    return queries.map(q => ({ id: q.id, name: q.name, isPublic: q.visibility === 2, userId: q.user_id }));
}
