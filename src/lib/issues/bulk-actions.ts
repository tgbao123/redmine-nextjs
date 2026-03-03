"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function bulkUpdateAction(
    issueIds: number[],
    updates: {
        statusId?: number;
        trackerId?: number;
        priorityId?: number;
        assignedToId?: number | null;
        versionId?: number | null;
        categoryId?: number | null;
        doneRatio?: number;
    }
) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };
    if (issueIds.length === 0) return { error: "No issues selected" };

    try {
        const data: Record<string, unknown> = { updated_on: new Date() };
        if (updates.statusId !== undefined) data.status_id = updates.statusId;
        if (updates.trackerId !== undefined) data.tracker_id = updates.trackerId;
        if (updates.priorityId !== undefined) data.priority_id = updates.priorityId;
        if (updates.assignedToId !== undefined) data.assigned_to_id = updates.assignedToId;
        if (updates.versionId !== undefined) data.fixed_version_id = updates.versionId;
        if (updates.categoryId !== undefined) data.category_id = updates.categoryId;
        if (updates.doneRatio !== undefined) data.done_ratio = updates.doneRatio;

        // Batch update
        await prisma.issues.updateMany({
            where: { id: { in: issueIds } },
            data,
        });

        // Create journal entries for each issue
        for (const issueId of issueIds) {
            await prisma.journals.create({
                data: {
                    journalized_id: issueId,
                    journalized_type: "Issue",
                    user_id: user.id,
                    notes: "",
                    created_on: new Date(),
                    private_notes: false,
                },
            });
        }

        return { success: true, count: issueIds.length };
    } catch (error) {
        console.error("Bulk update error:", error);
        return { error: "Failed to update issues" };
    }
}

export async function bulkDeleteAction(issueIds: number[]) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };
    if (issueIds.length === 0) return { error: "No issues selected" };

    try {
        // Delete related records first
        await prisma.journal_details.deleteMany({
            where: { journal_id: { in: (await prisma.journals.findMany({ where: { journalized_id: { in: issueIds }, journalized_type: "Issue" }, select: { id: true } })).map(j => j.id) } },
        });
        await prisma.journals.deleteMany({ where: { journalized_id: { in: issueIds }, journalized_type: "Issue" } });
        await prisma.time_entries.deleteMany({ where: { issue_id: { in: issueIds } } });
        await prisma.custom_values.deleteMany({ where: { customized_type: "Issue", customized_id: { in: issueIds } } });
        await prisma.issue_relations.deleteMany({ where: { OR: [{ issue_from_id: { in: issueIds } }, { issue_to_id: { in: issueIds } }] } });
        await prisma.watchers.deleteMany({ where: { watchable_type: "Issue", watchable_id: { in: issueIds } } });

        // Clear parent references
        await prisma.issues.updateMany({ where: { parent_id: { in: issueIds } }, data: { parent_id: null } });

        // Delete issues
        await prisma.issues.deleteMany({ where: { id: { in: issueIds } } });

        return { success: true, count: issueIds.length };
    } catch (error) {
        console.error("Bulk delete error:", error);
        return { error: "Failed to delete issues" };
    }
}

export async function bulkMoveAction(issueIds: number[], targetProjectId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };
    if (issueIds.length === 0) return { error: "No issues selected" };

    try {
        await prisma.issues.updateMany({
            where: { id: { in: issueIds } },
            data: { project_id: targetProjectId, updated_on: new Date() },
        });

        return { success: true, count: issueIds.length };
    } catch (error) {
        console.error("Bulk move error:", error);
        return { error: "Failed to move issues" };
    }
}

export async function bulkCopyAction(issueIds: number[], targetProjectId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };
    if (issueIds.length === 0) return { error: "No issues selected" };

    try {
        const issues = await prisma.issues.findMany({ where: { id: { in: issueIds } } });
        let count = 0;

        for (const issue of issues) {
            await prisma.issues.create({
                data: {
                    project_id: targetProjectId,
                    tracker_id: issue.tracker_id,
                    subject: issue.subject,
                    description: issue.description,
                    status_id: issue.status_id,
                    priority_id: issue.priority_id,
                    author_id: user.id,
                    assigned_to_id: issue.assigned_to_id,
                    start_date: issue.start_date,
                    due_date: issue.due_date,
                    estimated_hours: issue.estimated_hours,
                    done_ratio: 0,
                    is_private: issue.is_private,
                    created_on: new Date(),
                    updated_on: new Date(),
                    lft: 0, rgt: 0,
                },
            });
            count++;
        }

        return { success: true, count };
    } catch (error) {
        console.error("Bulk copy error:", error);
        return { error: "Failed to copy issues" };
    }
}
