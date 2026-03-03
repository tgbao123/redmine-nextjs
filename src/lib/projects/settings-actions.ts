"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

// ─── Project Update ───

export async function updateProjectAction(
    projectId: number,
    data: {
        name?: string;
        description?: string;
        homepage?: string;
        isPublic?: boolean;
        inheritMembers?: boolean;
        trackerIds?: number[];
        moduleNames?: string[];
    }
) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    const project = await prisma.projects.findFirst({ where: { id: projectId } });
    if (!project) return { error: "Project not found" };

    // Admin or project manager can edit
    if (!user.admin) {
        const member = await prisma.members.findFirst({ where: { project_id: projectId, user_id: user.id } });
        if (!member) return { error: "Permission denied" };
        const roles = await prisma.member_roles.findMany({ where: { member_id: member.id } });
        const roleData = await prisma.roles.findMany({ where: { id: { in: roles.map(r => r.role_id) } } });
        const hasPermission = roleData.some(r => (r.permissions || "").includes("edit_project"));
        if (!hasPermission) return { error: "Permission denied" };
    }

    try {
        await prisma.projects.update({
            where: { id: projectId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.homepage !== undefined && { homepage: data.homepage }),
                ...(data.isPublic !== undefined && { is_public: data.isPublic }),
                ...(data.inheritMembers !== undefined && { inherit_members: data.inheritMembers }),
                updated_on: new Date(),
            },
        });

        // Update trackers
        if (data.trackerIds !== undefined) {
            await prisma.projects_trackers.deleteMany({ where: { project_id: projectId } });
            if (data.trackerIds.length > 0) {
                await prisma.projects_trackers.createMany({
                    data: data.trackerIds.map(tracker_id => ({ project_id: projectId, tracker_id })),
                });
            }
        }

        // Update modules
        if (data.moduleNames !== undefined) {
            await prisma.enabled_modules.deleteMany({ where: { project_id: projectId } });
            if (data.moduleNames.length > 0) {
                await prisma.enabled_modules.createMany({
                    data: data.moduleNames.map(name => ({ project_id: projectId, name })),
                });
            }
        }

        revalidatePath(`/projects/${project.identifier}`);
        return { success: true };
    } catch (error) {
        console.error("Update project error:", error);
        return { error: "Failed to update project" };
    }
}

export async function deleteProjectAction(projectId: number) {
    const user = await getSession();
    if (!user?.admin) return { error: "Admin only" };

    try {
        // Delete in order: custom_values, members, enabled_modules, issues, time_entries, etc.
        await prisma.custom_values.deleteMany({ where: { customized_type: "Project", customized_id: projectId } });
        await prisma.enabled_modules.deleteMany({ where: { project_id: projectId } });
        await prisma.projects_trackers.deleteMany({ where: { project_id: projectId } });
        await prisma.member_roles.deleteMany({ where: { member_id: { in: (await prisma.members.findMany({ where: { project_id: projectId }, select: { id: true } })).map(m => m.id) } } });
        await prisma.members.deleteMany({ where: { project_id: projectId } });
        await prisma.time_entries.deleteMany({ where: { project_id: projectId } });
        await prisma.issue_categories.deleteMany({ where: { project_id: projectId } });
        await prisma.versions.deleteMany({ where: { project_id: projectId } });
        await prisma.issues.deleteMany({ where: { project_id: projectId } });
        await prisma.news.deleteMany({ where: { project_id: projectId } });
        await prisma.documents.deleteMany({ where: { project_id: projectId } });
        await prisma.wikis.deleteMany({ where: { project_id: projectId } });
        await prisma.boards.deleteMany({ where: { project_id: projectId } });
        await prisma.projects.delete({ where: { id: projectId } });

        revalidatePath("/projects");
        return { success: true };
    } catch (error) {
        console.error("Delete project error:", error);
        return { error: "Failed to delete project" };
    }
}

export async function archiveProjectAction(projectId: number, archive: boolean) {
    const user = await getSession();
    if (!user?.admin) return { error: "Admin only" };

    try {
        await prisma.projects.update({
            where: { id: projectId },
            data: { status: archive ? 9 : 1, updated_on: new Date() },
        });
        revalidatePath("/projects");
        return { success: true };
    } catch (error) {
        console.error("Archive project error:", error);
        return { error: "Failed to archive project" };
    }
}

// ─── Members ───

export async function addMemberAction(projectId: number, userId: number, roleIds: number[]) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        const existing = await prisma.members.findFirst({ where: { project_id: projectId, user_id: userId } });
        if (existing) return { error: "User is already a member" };

        const member = await prisma.members.create({
            data: { user_id: userId, project_id: projectId, created_on: new Date() },
        });

        if (roleIds.length > 0) {
            await prisma.member_roles.createMany({
                data: roleIds.map(role_id => ({ member_id: member.id, role_id })),
            });
        }

        const project = await prisma.projects.findFirst({ where: { id: projectId }, select: { identifier: true } });
        revalidatePath(`/projects/${project?.identifier}/settings`);
        return { success: true };
    } catch (error) {
        console.error("Add member error:", error);
        return { error: "Failed to add member" };
    }
}

export async function removeMemberAction(projectId: number, memberId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.member_roles.deleteMany({ where: { member_id: memberId } });
        await prisma.members.delete({ where: { id: memberId } });

        const project = await prisma.projects.findFirst({ where: { id: projectId }, select: { identifier: true } });
        revalidatePath(`/projects/${project?.identifier}/settings`);
        return { success: true };
    } catch (error) {
        console.error("Remove member error:", error);
        return { error: "Failed to remove member" };
    }
}

export async function updateMemberRolesAction(memberId: number, roleIds: number[]) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.member_roles.deleteMany({ where: { member_id: memberId } });
        if (roleIds.length > 0) {
            await prisma.member_roles.createMany({
                data: roleIds.map(role_id => ({ member_id: memberId, role_id })),
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Update member roles error:", error);
        return { error: "Failed to update roles" };
    }
}

// ─── Versions ───

export async function createVersionAction(
    projectId: number,
    data: { name: string; description?: string; status?: string; effectiveDate?: string; sharing?: string; wikiPageTitle?: string }
) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.versions.create({
            data: {
                project_id: projectId,
                name: data.name,
                description: data.description || "",
                status: data.status || "open",
                effective_date: data.effectiveDate ? new Date(data.effectiveDate) : null,
                sharing: data.sharing || "none",
                wiki_page_title: data.wikiPageTitle || null,
                created_on: new Date(),
                updated_on: new Date(),
            },
        });

        const project = await prisma.projects.findFirst({ where: { id: projectId }, select: { identifier: true } });
        revalidatePath(`/projects/${project?.identifier}`);
        return { success: true };
    } catch (error) {
        console.error("Create version error:", error);
        return { error: "Failed to create version" };
    }
}

export async function updateVersionAction(versionId: number, data: { name?: string; description?: string; status?: string; effectiveDate?: string; sharing?: string }) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.versions.update({
            where: { id: versionId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.effectiveDate !== undefined && { effective_date: data.effectiveDate ? new Date(data.effectiveDate) : null }),
                ...(data.sharing !== undefined && { sharing: data.sharing }),
                updated_on: new Date(),
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Update version error:", error);
        return { error: "Failed to update version" };
    }
}

export async function deleteVersionAction(versionId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        // Unlink issues from this version
        await prisma.issues.updateMany({ where: { fixed_version_id: versionId }, data: { fixed_version_id: null } });
        await prisma.versions.delete({ where: { id: versionId } });
        return { success: true };
    } catch (error) {
        console.error("Delete version error:", error);
        return { error: "Failed to delete version" };
    }
}

// ─── Issue Categories ───

export async function createCategoryAction(projectId: number, data: { name: string; assignedToId?: number }) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.issue_categories.create({
            data: {
                project_id: projectId,
                name: data.name,
                assigned_to_id: data.assignedToId || null,
            },
        });

        const project = await prisma.projects.findFirst({ where: { id: projectId }, select: { identifier: true } });
        revalidatePath(`/projects/${project?.identifier}/settings`);
        return { success: true };
    } catch (error) {
        console.error("Create category error:", error);
        return { error: "Failed to create category" };
    }
}

export async function updateCategoryAction(categoryId: number, data: { name?: string; assignedToId?: number | null }) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        await prisma.issue_categories.update({
            where: { id: categoryId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.assignedToId !== undefined && { assigned_to_id: data.assignedToId }),
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Update category error:", error);
        return { error: "Failed to update category" };
    }
}

export async function deleteCategoryAction(categoryId: number, reassignTo?: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    try {
        if (reassignTo) {
            await prisma.issues.updateMany({ where: { category_id: categoryId }, data: { category_id: reassignTo } });
        } else {
            await prisma.issues.updateMany({ where: { category_id: categoryId }, data: { category_id: null } });
        }
        await prisma.issue_categories.delete({ where: { id: categoryId } });
        return { success: true };
    } catch (error) {
        console.error("Delete category error:", error);
        return { error: "Failed to delete category" };
    }
}
