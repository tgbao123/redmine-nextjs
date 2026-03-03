"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function addRelationAction(
    issueId: number,
    targetIssueId: number,
    relationType: string,
    delay?: number
) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    if (issueId === targetIssueId) return { error: "Cannot relate an issue to itself" };

    // Verify both issues exist
    const [issue, target] = await Promise.all([
        prisma.issues.findFirst({ where: { id: issueId }, select: { id: true, project_id: true } }),
        prisma.issues.findFirst({ where: { id: targetIssueId }, select: { id: true } }),
    ]);
    if (!issue || !target) return { error: "Issue not found" };

    // Check if relation already exists
    const existing = await prisma.issue_relations.findFirst({
        where: {
            OR: [
                { issue_from_id: issueId, issue_to_id: targetIssueId },
                { issue_from_id: targetIssueId, issue_to_id: issueId },
            ],
        },
    });
    if (existing) return { error: "Relation already exists" };

    try {
        await prisma.issue_relations.create({
            data: {
                issue_from_id: issueId,
                issue_to_id: targetIssueId,
                relation_type: relationType,
                delay: delay || null,
            },
        });

        const project = await prisma.projects.findFirst({ where: { id: issue.project_id }, select: { identifier: true } });
        revalidatePath(`/projects/${project?.identifier}/issues/${issueId}`);
        return { success: true };
    } catch (error) {
        console.error("Add relation error:", error);
        return { error: "Failed to add relation" };
    }
}

export async function deleteRelationAction(relationId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        const relation = await prisma.issue_relations.findFirst({ where: { id: relationId } });
        if (!relation) return { error: "Not found" };

        await prisma.issue_relations.delete({ where: { id: relationId } });

        const issue = await prisma.issues.findFirst({ where: { id: relation.issue_from_id }, select: { project_id: true } });
        const project = issue ? await prisma.projects.findFirst({ where: { id: issue.project_id }, select: { identifier: true } }) : null;
        if (project) revalidatePath(`/projects/${project.identifier}/issues/${relation.issue_from_id}`);

        return { success: true };
    } catch (error) {
        console.error("Delete relation error:", error);
        return { error: "Failed to delete relation" };
    }
}
