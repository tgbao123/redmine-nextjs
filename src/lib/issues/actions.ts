"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { revalidatePath } from "next/cache";

// ─── Types ───

export interface CreateIssueData {
    projectId: number;
    trackerId: number;
    subject: string;
    description?: string;
    statusId: number;
    priorityId: number;
    assignedToId?: number | null;
    categoryId?: number | null;
    fixedVersionId?: number | null;
    parentId?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    estimatedHours?: number | null;
    doneRatio?: number;
    isPrivate?: boolean;
    customFields?: { fieldId: number; value: string }[];
}

export interface UpdateIssueData {
    subject?: string;
    description?: string;
    trackerId?: number;
    statusId?: number;
    priorityId?: number;
    assignedToId?: number | null;
    categoryId?: number | null;
    fixedVersionId?: number | null;
    parentId?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    estimatedHours?: number | null;
    doneRatio?: number;
    isPrivate?: boolean;
    notes?: string;
    privateNotes?: boolean;
    customFields?: { fieldId: number; value: string }[];
    // Log time fields
    spentTime?: number;
    activityId?: number;
    timeComment?: string;
}

// ─── Helpers ───

async function createJournalEntry(
    issueId: number,
    userId: number,
    notes: string | null,
    changes: { property: string; propKey: string; oldValue: string | null; newValue: string | null }[]
) {
    const journal = await prisma.journals.create({
        data: {
            journalized_id: issueId,
            journalized_type: "Issue",
            user_id: userId,
            notes: notes || "",
            created_on: new Date(),
        },
    });

    if (changes.length > 0) {
        await prisma.journal_details.createMany({
            data: changes.map((c) => ({
                journal_id: journal.id,
                property: c.property,
                prop_key: c.propKey,
                old_value: c.oldValue,
                value: c.newValue,
            })),
        });
    }

    return journal;
}

function getProjectPath(identifier: string) {
    return `/projects/${identifier}`;
}

// ─── Create Issue ───

export async function createIssueAction(
    projectIdentifier: string,
    data: CreateIssueData
): Promise<{ success: boolean; issueId?: number; error?: string }> {
    try {
        const user = await requirePermission(data.projectId, Permission.ADD_ISSUES);

        // Calculate nested set values (lft/rgt)
        const maxRgt = await prisma.issues.aggregate({ _max: { rgt: true } });
        const newLft = (maxRgt._max.rgt || 0) + 1;
        const newRgt = newLft + 1;

        // If parent issue, adjust lft/rgt
        let rootId: number | null = null;
        if (data.parentId) {
            const parent = await prisma.issues.findFirst({
                where: { id: data.parentId },
                select: { root_id: true },
            });
            rootId = parent?.root_id || data.parentId;
        }

        const issue = await prisma.issues.create({
            data: {
                project_id: data.projectId,
                tracker_id: data.trackerId,
                subject: data.subject,
                description: data.description || "",
                status_id: data.statusId,
                priority_id: data.priorityId,
                assigned_to_id: data.assignedToId || null,
                category_id: data.categoryId || null,
                fixed_version_id: data.fixedVersionId || null,
                parent_id: data.parentId || null,
                root_id: rootId,
                start_date: data.startDate ? new Date(data.startDate) : null,
                due_date: data.dueDate ? new Date(data.dueDate) : null,
                estimated_hours: data.estimatedHours || null,
                done_ratio: data.doneRatio || 0,
                is_private: data.isPrivate || false,
                author_id: user.id,
                lft: newLft,
                rgt: newRgt,
                lock_version: 0,
                created_on: new Date(),
                updated_on: new Date(),
            },
        });

        // Set root_id to self if no parent
        if (!data.parentId) {
            await prisma.issues.update({
                where: { id: issue.id },
                data: { root_id: issue.id },
            });
        }

        // Save custom field values
        if (data.customFields && data.customFields.length > 0) {
            await prisma.custom_values.createMany({
                data: data.customFields.map((cf) => ({
                    customized_type: "Issue",
                    customized_id: issue.id,
                    custom_field_id: cf.fieldId,
                    value: cf.value,
                })),
            });
        }

        revalidatePath(getProjectPath(projectIdentifier));
        return { success: true, issueId: issue.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── Update Issue ───

export async function updateIssueAction(
    projectIdentifier: string,
    issueId: number,
    projectId: number,
    data: UpdateIssueData
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.EDIT_ISSUES);

        // Fetch current issue for journal diff
        const currentIssue = await prisma.issues.findFirst({
            where: { id: issueId },
        });

        if (!currentIssue) {
            return { success: false, error: "Issue not found" };
        }

        // Build changes for journal
        const changes: { property: string; propKey: string; oldValue: string | null; newValue: string | null }[] = [];
        const updateData: any = { updated_on: new Date() };

        if (data.subject !== undefined && data.subject !== currentIssue.subject) {
            changes.push({ property: "attr", propKey: "subject", oldValue: currentIssue.subject, newValue: data.subject });
            updateData.subject = data.subject;
        }

        if (data.description !== undefined && data.description !== (currentIssue.description || "")) {
            changes.push({ property: "attr", propKey: "description", oldValue: currentIssue.description, newValue: data.description });
            updateData.description = data.description;
        }

        if (data.trackerId !== undefined && data.trackerId !== currentIssue.tracker_id) {
            changes.push({ property: "attr", propKey: "tracker_id", oldValue: String(currentIssue.tracker_id), newValue: String(data.trackerId) });
            updateData.tracker_id = data.trackerId;
        }

        if (data.statusId !== undefined && data.statusId !== currentIssue.status_id) {
            changes.push({ property: "attr", propKey: "status_id", oldValue: String(currentIssue.status_id), newValue: String(data.statusId) });
            updateData.status_id = data.statusId;
        }

        if (data.priorityId !== undefined && data.priorityId !== currentIssue.priority_id) {
            changes.push({ property: "attr", propKey: "priority_id", oldValue: String(currentIssue.priority_id), newValue: String(data.priorityId) });
            updateData.priority_id = data.priorityId;
        }

        if (data.assignedToId !== undefined && data.assignedToId !== currentIssue.assigned_to_id) {
            changes.push({ property: "attr", propKey: "assigned_to_id", oldValue: currentIssue.assigned_to_id ? String(currentIssue.assigned_to_id) : null, newValue: data.assignedToId ? String(data.assignedToId) : null });
            updateData.assigned_to_id = data.assignedToId;
        }

        if (data.categoryId !== undefined && data.categoryId !== currentIssue.category_id) {
            changes.push({ property: "attr", propKey: "category_id", oldValue: currentIssue.category_id ? String(currentIssue.category_id) : null, newValue: data.categoryId ? String(data.categoryId) : null });
            updateData.category_id = data.categoryId;
        }

        if (data.fixedVersionId !== undefined && data.fixedVersionId !== currentIssue.fixed_version_id) {
            changes.push({ property: "attr", propKey: "fixed_version_id", oldValue: currentIssue.fixed_version_id ? String(currentIssue.fixed_version_id) : null, newValue: data.fixedVersionId ? String(data.fixedVersionId) : null });
            updateData.fixed_version_id = data.fixedVersionId;
        }

        if (data.doneRatio !== undefined && data.doneRatio !== currentIssue.done_ratio) {
            changes.push({ property: "attr", propKey: "done_ratio", oldValue: String(currentIssue.done_ratio), newValue: String(data.doneRatio) });
            updateData.done_ratio = data.doneRatio;
        }

        if (data.startDate !== undefined) {
            const newStart = data.startDate ? new Date(data.startDate) : null;
            const oldStart = currentIssue.start_date;
            if (newStart?.toISOString() !== oldStart?.toISOString()) {
                changes.push({ property: "attr", propKey: "start_date", oldValue: oldStart ? oldStart.toISOString().split("T")[0] : null, newValue: data.startDate || null });
                updateData.start_date = newStart;
            }
        }

        if (data.dueDate !== undefined) {
            const newDue = data.dueDate ? new Date(data.dueDate) : null;
            const oldDue = currentIssue.due_date;
            if (newDue?.toISOString() !== oldDue?.toISOString()) {
                changes.push({ property: "attr", propKey: "due_date", oldValue: oldDue ? oldDue.toISOString().split("T")[0] : null, newValue: data.dueDate || null });
                updateData.due_date = newDue;
            }
        }

        if (data.estimatedHours !== undefined && data.estimatedHours !== Number(currentIssue.estimated_hours)) {
            changes.push({ property: "attr", propKey: "estimated_hours", oldValue: currentIssue.estimated_hours ? String(currentIssue.estimated_hours) : null, newValue: data.estimatedHours ? String(data.estimatedHours) : null });
            updateData.estimated_hours = data.estimatedHours;
        }

        // Update custom fields
        if (data.customFields && data.customFields.length > 0) {
            for (const cf of data.customFields) {
                const existing = await prisma.custom_values.findFirst({
                    where: { customized_type: "Issue", customized_id: issueId, custom_field_id: cf.fieldId },
                });

                const oldVal = existing?.value || null;
                if (oldVal !== cf.value) {
                    changes.push({ property: "cf", propKey: String(cf.fieldId), oldValue: oldVal, newValue: cf.value });

                    if (existing) {
                        await prisma.custom_values.update({
                            where: { id: existing.id },
                            data: { value: cf.value },
                        });
                    } else {
                        await prisma.custom_values.create({
                            data: { customized_type: "Issue", customized_id: issueId, custom_field_id: cf.fieldId, value: cf.value },
                        });
                    }
                }
            }
        }

        // Handle is_private change
        if (data.isPrivate !== undefined && data.isPrivate !== currentIssue.is_private) {
            changes.push({ property: "attr", propKey: "is_private", oldValue: String(currentIssue.is_private), newValue: String(data.isPrivate) });
            updateData.is_private = data.isPrivate;
        }

        // Only update if there are actual changes or notes
        if (changes.length > 0 || data.notes) {
            if (Object.keys(updateData).length > 1) {
                await prisma.issues.update({
                    where: { id: issueId },
                    data: updateData,
                });
            }

            await createJournalEntry(issueId, user.id, data.notes || null, changes);
        }

        // Log time entry if spent time provided
        if (data.spentTime && data.spentTime > 0 && data.activityId) {
            await prisma.time_entries.create({
                data: {
                    project_id: projectId,
                    issue_id: issueId,
                    user_id: user.id,
                    activity_id: data.activityId,
                    hours: data.spentTime,
                    comments: data.timeComment || "",
                    spent_on: new Date(),
                    tyear: new Date().getFullYear(),
                    tmonth: new Date().getMonth() + 1,
                    tweek: Math.ceil((new Date().getDate()) / 7),
                    created_on: new Date(),
                    updated_on: new Date(),
                },
            });
        }

        revalidatePath(getProjectPath(projectIdentifier));
        revalidatePath(`${getProjectPath(projectIdentifier)}/issues/${issueId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── Delete Issue ───

export async function deleteIssueAction(
    projectIdentifier: string,
    issueId: number,
    projectId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermission(projectId, Permission.DELETE_ISSUES);

        // Delete related records first
        await prisma.journal_details.deleteMany({
            where: {
                journal_id: {
                    in: (await prisma.journals.findMany({
                        where: { journalized_id: issueId, journalized_type: "Issue" },
                        select: { id: true },
                    })).map((j) => j.id),
                },
            },
        });

        await prisma.journals.deleteMany({
            where: { journalized_id: issueId, journalized_type: "Issue" },
        });

        await prisma.custom_values.deleteMany({
            where: { customized_id: issueId, customized_type: "Issue" },
        });

        await prisma.time_entries.updateMany({
            where: { issue_id: issueId },
            data: { issue_id: null },
        });

        await prisma.issue_relations.deleteMany({
            where: { OR: [{ issue_from_id: issueId }, { issue_to_id: issueId }] },
        });

        await prisma.watchers.deleteMany({
            where: { watchable_id: issueId, watchable_type: "Issue" },
        });

        await prisma.issues.delete({ where: { id: issueId } });

        revalidatePath(getProjectPath(projectIdentifier));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── Add Note ───

export async function addNoteAction(
    projectIdentifier: string,
    issueId: number,
    projectId: number,
    notes: string,
    privateNotes: boolean = false
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requirePermission(projectId, Permission.ADD_ISSUE_NOTES);

        await prisma.journals.create({
            data: {
                journalized_id: issueId,
                journalized_type: "Issue",
                user_id: user.id,
                notes,
                private_notes: privateNotes,
                created_on: new Date(),
            },
        });

        await prisma.issues.update({
            where: { id: issueId },
            data: { updated_on: new Date() },
        });

        revalidatePath(`${getProjectPath(projectIdentifier)}/issues/${issueId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
