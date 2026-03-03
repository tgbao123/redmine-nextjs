"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function createProjectAction(formData: FormData) {
    const user = await getSession();

    if (!user) {
        return { error: "Not authenticated" };
    }

    if (!user.admin) {
        return { error: "Permission denied" };
    }

    const name = formData.get("name") as string;
    const identifier = formData.get("identifier") as string;
    const description = formData.get("description") as string || null;
    const homepage = formData.get("homepage") as string || null;
    const parentId = formData.get("parent_id") as string;
    const isPublic = formData.get("is_public") === "on";
    const inheritMembers = formData.get("inherit_members") === "on";
    const trackerIds = formData.getAll("trackers").map(id => parseInt(id as string));
    const moduleNames = formData.getAll("modules") as string[];
    const continueAfter = formData.get("continue") === "1";

    if (!name || !identifier) {
        return { error: "Name and identifier are required" };
    }

    // Validate identifier format
    if (!/^[a-z0-9-_]+$/.test(identifier)) {
        return { error: "Identifier must contain only lowercase letters, numbers, dashes and underscores" };
    }

    if (identifier.length > 100) {
        return { error: "Identifier must be 100 characters or less" };
    }

    // Check identifier uniqueness
    const existing = await prisma.projects.findFirst({
        where: { identifier }
    });

    if (existing) {
        return { error: "Identifier already exists" };
    }

    try {
        // Calculate lft/rgt for nested set (required by Redmine)
        // Get max rgt value to append at end of tree
        const maxRgt = await prisma.projects.aggregate({
            _max: { rgt: true }
        });
        const newLft = (maxRgt._max.rgt || 0) + 1;
        const newRgt = newLft + 1;

        // Create project
        const project = await prisma.projects.create({
            data: {
                name,
                identifier,
                description,
                homepage,
                parent_id: parentId ? parseInt(parentId) : null,
                is_public: isPublic,
                inherit_members: inheritMembers,
                status: 1, // Active
                lft: newLft,
                rgt: newRgt,
                created_on: new Date(),
                updated_on: new Date(),
            }
        });

        // Add trackers to project
        if (trackerIds.length > 0) {
            await prisma.projects_trackers.createMany({
                data: trackerIds.map(tracker_id => ({
                    project_id: project.id,
                    tracker_id
                }))
            });
        }

        // Add selected modules
        if (moduleNames.length > 0) {
            await prisma.enabled_modules.createMany({
                data: moduleNames.map(name => ({
                    project_id: project.id,
                    name
                }))
            });
        }

        // Add creator as member with Manager role
        const managerRole = await prisma.roles.findFirst({
            where: { name: "Manager" }
        });

        if (managerRole) {
            const member = await prisma.members.create({
                data: {
                    user_id: user.id,
                    project_id: project.id,
                    created_on: new Date()
                }
            });

            await prisma.member_roles.create({
                data: {
                    member_id: member.id,
                    role_id: managerRole.id
                }
            });
        }

        // Handle custom field values
        const customFieldEntries = Array.from(formData.entries())
            .filter(([key]) => key.startsWith("custom_field_"));

        if (customFieldEntries.length > 0) {
            await prisma.custom_values.createMany({
                data: customFieldEntries.map(([key, value]) => ({
                    customized_type: "Project",
                    customized_id: project.id,
                    custom_field_id: parseInt(key.replace("custom_field_", "")),
                    value: value as string
                }))
            });
        }

        // Inherit members from parent if enabled
        if (inheritMembers && parentId) {
            const parentMembers = await prisma.members.findMany({
                where: { project_id: parseInt(parentId) },
                select: { id: true, user_id: true }
            });

            for (const parentMember of parentMembers) {
                // Skip if user already added
                if (parentMember.user_id === user.id) continue;

                const newMember = await prisma.members.create({
                    data: {
                        user_id: parentMember.user_id,
                        project_id: project.id,
                        created_on: new Date()
                    }
                });

                // Copy roles from parent member
                const parentRoles = await prisma.member_roles.findMany({
                    where: { member_id: parentMember.id },
                    select: { role_id: true }
                });
                if (parentRoles.length > 0) {
                    await prisma.member_roles.createMany({
                        data: parentRoles.map((mr) => ({
                            member_id: newMember.id,
                            role_id: mr.role_id
                        }))
                    });
                }
            }
        }

        revalidatePath("/projects");

        if (continueAfter) {
            return { success: true, continue: true };
        }

        return { success: true, identifier: project.identifier };
    } catch (error) {
        console.error("Create project error:", error);
        return { error: "Failed to create project" };
    }
}
