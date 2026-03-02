"use server";

import { prisma } from "@/lib/db/prisma";
import { getUserProjectRoleIds } from "./index";

/**
 * Represents a workflow transition rule.
 */
export interface WorkflowTransition {
    oldStatusId: number;
    newStatusId: number;
    assignee: boolean;
    author: boolean;
}

/**
 * Get allowed status transitions for a user in a project, given a tracker and current status.
 *
 * Redmine workflow logic:
 * 1. Find all WorkflowTransition records matching (role_id, tracker_id, old_status_id)
 * 2. A transition is allowed if:
 *    - assignee=false AND author=false (always allowed for the role), OR
 *    - assignee=true AND user is the current assignee, OR
 *    - author=true AND user is the issue author
 * 3. Admin bypasses all workflow restrictions
 */
export async function getAllowedTransitions(
    userId: number,
    projectId: number,
    trackerId: number,
    currentStatusId: number,
    isAdmin: boolean = false,
    issueAuthorId?: number,
    issueAssigneeId?: number
): Promise<number[]> {
    // Admin can transition to any status
    if (isAdmin) {
        const allStatuses = await prisma.issue_statuses.findMany({
            select: { id: true },
        });
        return allStatuses
            .map((s) => s.id)
            .filter((id) => id !== currentStatusId);
    }

    // Get user's role IDs in the project
    const roleIds = await getUserProjectRoleIds(userId, projectId);

    if (roleIds.length === 0) return [];

    // Fetch all matching workflow transitions
    const transitions = await prisma.workflows.findMany({
        where: {
            tracker_id: trackerId,
            old_status_id: currentStatusId,
            role_id: { in: roleIds },
            type: "WorkflowTransition",
        },
        select: {
            new_status_id: true,
            assignee: true,
            author: true,
        },
    });

    const allowedStatusIds = new Set<number>();
    const isAssignee = issueAssigneeId === userId;
    const isAuthor = issueAuthorId === userId;

    for (const t of transitions) {
        // Standard transition (not restricted to assignee/author)
        if (!t.assignee && !t.author) {
            allowedStatusIds.add(t.new_status_id);
            continue;
        }

        // Assignee-only transition
        if (t.assignee && isAssignee) {
            allowedStatusIds.add(t.new_status_id);
        }

        // Author-only transition
        if (t.author && isAuthor) {
            allowedStatusIds.add(t.new_status_id);
        }
    }

    return Array.from(allowedStatusIds);
}

/**
 * Get the full workflow matrix for a role and tracker.
 * Returns a map of old_status_id → allowed new_status_ids.
 * Used in the admin workflow editor.
 */
export async function getWorkflowMatrix(
    roleId: number,
    trackerId: number
): Promise<Map<number, Set<number>>> {
    const transitions = await prisma.workflows.findMany({
        where: {
            role_id: roleId,
            tracker_id: trackerId,
            type: "WorkflowTransition",
        },
        select: {
            old_status_id: true,
            new_status_id: true,
        },
    });

    const matrix = new Map<number, Set<number>>();

    for (const t of transitions) {
        if (!matrix.has(t.old_status_id)) {
            matrix.set(t.old_status_id, new Set());
        }
        matrix.get(t.old_status_id)!.add(t.new_status_id);
    }

    return matrix;
}

/**
 * Update workflow transitions for a role and tracker.
 * Replaces all existing transitions with the new matrix.
 */
export async function updateWorkflowMatrix(
    roleId: number,
    trackerId: number,
    transitions: { oldStatusId: number; newStatusId: number }[]
): Promise<void> {
    // Delete existing transitions for this role/tracker
    await prisma.workflows.deleteMany({
        where: {
            role_id: roleId,
            tracker_id: trackerId,
            type: "WorkflowTransition",
        },
    });

    // Insert new transitions
    if (transitions.length > 0) {
        await prisma.workflows.createMany({
            data: transitions.map((t) => ({
                role_id: roleId,
                tracker_id: trackerId,
                old_status_id: t.oldStatusId,
                new_status_id: t.newStatusId,
                type: "WorkflowTransition",
                assignee: false,
                author: false,
            })),
        });
    }
}

/**
 * Get all available issue statuses, ordered by position.
 */
export async function getIssueStatuses(): Promise<
    { id: number; name: string; is_closed: boolean; position: number | null }[]
> {
    return prisma.issue_statuses.findMany({
        orderBy: { position: "asc" },
        select: { id: true, name: true, is_closed: true, position: true },
    });
}
