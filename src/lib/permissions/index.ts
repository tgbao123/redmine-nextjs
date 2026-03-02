"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { parsePermissions, BUILTIN_ROLE, type PermissionKey } from "./constants";

/**
 * Cached role permissions to avoid re-parsing YAML on every check.
 * Key: role_id, Value: Set of permission strings
 */
const rolePermissionCache = new Map<number, Set<string>>();

/**
 * Get parsed permissions for a role, with caching.
 */
async function getRolePermissions(roleId: number): Promise<Set<string>> {
    const cached = rolePermissionCache.get(roleId);
    if (cached) return cached;

    const role = await prisma.roles.findFirst({
        where: { id: roleId },
        select: { permissions: true },
    });

    const perms = parsePermissions(role?.permissions ?? null);
    rolePermissionCache.set(roleId, perms);
    return perms;
}

/**
 * Clear the role permission cache (call after admin updates roles).
 */
export async function clearPermissionCache(): Promise<void> {
    rolePermissionCache.clear();
}

/**
 * Get all role IDs a user has in a specific project.
 * Returns empty array if user is not a member.
 */
export async function getUserProjectRoleIds(
    userId: number,
    projectId: number
): Promise<number[]> {
    const member = await prisma.members.findFirst({
        where: { user_id: userId, project_id: projectId },
        select: { id: true },
    });

    if (!member) return [];

    const memberRoles = await prisma.member_roles.findMany({
        where: { member_id: member.id },
        select: { role_id: true },
    });

    return memberRoles.map((mr) => mr.role_id);
}

/**
 * Get the full role objects for a user in a project.
 */
export async function getUserProjectRoles(
    userId: number,
    projectId: number
): Promise<{ id: number; name: string; permissions: Set<string> }[]> {
    const roleIds = await getUserProjectRoleIds(userId, projectId);

    if (roleIds.length === 0) return [];

    const roles = await prisma.roles.findMany({
        where: { id: { in: roleIds } },
        select: { id: true, name: true, permissions: true },
    });

    return roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: parsePermissions(r.permissions),
    }));
}

/**
 * Check if a user has a specific permission in a project.
 *
 * Logic follows Redmine 3.4.5:
 * 1. Admin users bypass all permission checks
 * 2. Check if user is a project member → use their role permissions
 * 3. If not a member → use "Non member" (builtin=1) role
 * 4. Check if project is public → anonymous might have access
 */
export async function hasPermission(
    userId: number,
    projectId: number,
    permission: PermissionKey,
    isAdmin: boolean = false
): Promise<boolean> {
    // Admin bypasses all permission checks
    if (isAdmin) return true;

    // Get user's role IDs in this project
    const roleIds = await getUserProjectRoleIds(userId, projectId);

    if (roleIds.length > 0) {
        // User is a member — check their role permissions
        for (const roleId of roleIds) {
            const perms = await getRolePermissions(roleId);
            if (perms.has(permission)) return true;
        }
        return false;
    }

    // Not a member — check if project is public
    const project = await prisma.projects.findFirst({
        where: { id: projectId },
        select: { is_public: true },
    });

    if (!project?.is_public) return false;

    // Public project, non-member — use "Non member" role
    const nonMemberPerms = await getRolePermissions(BUILTIN_ROLE.NON_MEMBER);
    return nonMemberPerms.has(permission);
}

/**
 * Check if the current session user has a permission.
 * Convenience wrapper that reads the session automatically.
 */
export async function checkPermission(
    projectId: number,
    permission: PermissionKey
): Promise<boolean> {
    const user = await getSession();
    if (!user) return false;
    return hasPermission(user.id, projectId, permission, user.admin);
}

/**
 * Require a permission or throw an error. Use in server actions.
 */
export async function requirePermission(
    projectId: number,
    permission: PermissionKey
): Promise<SessionUser> {
    const user = await getSession();
    if (!user) {
        throw new Error("Not authenticated");
    }

    const allowed = await hasPermission(user.id, projectId, permission, user.admin);
    if (!allowed) {
        throw new Error("Permission denied");
    }

    return user;
}

/**
 * Get all permissions a user has in a specific project.
 * Returns a Set of permission strings.
 */
export async function getUserPermissions(
    userId: number,
    projectId: number,
    isAdmin: boolean = false
): Promise<Set<string>> {
    // Admin has all permissions
    if (isAdmin) {
        return new Set(Object.values(await import("./constants").then((m) => m.Permission)));
    }

    const roleIds = await getUserProjectRoleIds(userId, projectId);
    const allPerms = new Set<string>();

    if (roleIds.length > 0) {
        for (const roleId of roleIds) {
            const perms = await getRolePermissions(roleId);
            perms.forEach((p) => allPerms.add(p));
        }
    } else {
        // Check non-member role for public projects
        const project = await prisma.projects.findFirst({
            where: { id: projectId },
            select: { is_public: true },
        });

        if (project?.is_public) {
            const nonMemberPerms = await getRolePermissions(BUILTIN_ROLE.NON_MEMBER);
            nonMemberPerms.forEach((p) => allPerms.add(p));
        }
    }

    return allPerms;
}

/**
 * Check if a user is a member of a project.
 */
export async function isProjectMember(
    userId: number,
    projectId: number
): Promise<boolean> {
    const member = await prisma.members.findFirst({
        where: { user_id: userId, project_id: projectId },
        select: { id: true },
    });
    return !!member;
}

/**
 * Check if a user can access a project (view it).
 * Admin can access all. Members can access their projects. Anyone can access public projects.
 */
export async function canAccessProject(
    userId: number,
    projectId: number,
    isAdmin: boolean = false
): Promise<boolean> {
    if (isAdmin) return true;

    const project = await prisma.projects.findFirst({
        where: { id: projectId, status: 1 }, // Active only
        select: { is_public: true },
    });

    if (!project) return false;
    if (project.is_public) return true;

    return isProjectMember(userId, projectId);
}
