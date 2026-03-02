"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function requireAdmin(user: any) {
    if (!user?.admin) throw new Error("Admin access required");
    return user;
}

function hashPassword(password: string, salt: string): string {
    const inner = crypto.createHash("sha1").update(password).digest("hex");
    return crypto.createHash("sha1").update(salt + inner).digest("hex");
}

// ─── Users ───

export async function getUsersAction(filters: { status?: string; name?: string }) {
    const user = await getSession();
    requireAdmin(user);

    const where: any = { type: "User" };
    if (filters.status && filters.status !== "all") {
        where.status = parseInt(filters.status);
    }
    if (filters.name) {
        where.OR = [
            { login: { contains: filters.name } },
            { firstname: { contains: filters.name } },
            { lastname: { contains: filters.name } },
        ];
    }

    return prisma.users.findMany({
        where,
        orderBy: { login: "asc" },
        select: { id: true, login: true, firstname: true, lastname: true, admin: true, status: true, last_login_on: true, created_on: true },
    });
}

export async function createUserAction(data: {
    login: string; password: string; firstname: string; lastname: string;
    mail: string; admin: boolean; language: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);

        const existing = await prisma.users.findFirst({ where: { login: data.login } });
        if (existing) return { success: false, error: "Login already exists" };

        const salt = crypto.randomBytes(16).toString("hex");
        const hashed = hashPassword(data.password, salt);

        const newUser = await prisma.users.create({
            data: {
                login: data.login, hashed_password: hashed, salt,
                firstname: data.firstname, lastname: data.lastname,
                admin: data.admin,
                language: data.language || "en", type: "User",
                status: 1, mail_notification: "only_my_events",
                created_on: new Date(), updated_on: new Date(),
            },
        });

        // Create email address record
        if (data.mail) {
            await prisma.email_addresses.create({
                data: { user_id: newUser.id, address: data.mail, is_default: true, notify: true, created_on: new Date(), updated_on: new Date() },
            });
        }

        revalidatePath("/admin/users");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateUserAction(userId: number, data: {
    firstname?: string; lastname?: string;
    admin?: boolean; language?: string; status?: number;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.users.update({ where: { id: userId }, data: { ...data, updated_on: new Date() } });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function lockUserAction(userId: number, lock: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.users.update({ where: { id: userId }, data: { status: lock ? 3 : 1 } });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ─── Roles ───

export async function getRolesAction() {
    const user = await getSession();
    requireAdmin(user);
    return prisma.roles.findMany({ orderBy: { position: "asc" } });
}

export async function createRoleAction(data: { name: string; permissions: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const maxPos = await prisma.roles.aggregate({ _max: { position: true } });
        await prisma.roles.create({
            data: { name: data.name, permissions: data.permissions, position: (maxPos._max.position || 0) + 1, builtin: 0, assignable: true },
        });
        revalidatePath("/admin/roles");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateRoleAction(roleId: number, data: { name?: string; permissions?: string; assignable?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.roles.update({ where: { id: roleId }, data });
        revalidatePath("/admin/roles");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteRoleAction(roleId: number): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const role = await prisma.roles.findFirst({ where: { id: roleId } });
        if (role?.builtin !== 0) return { success: false, error: "Cannot delete builtin role" };
        await prisma.member_roles.deleteMany({ where: { role_id: roleId } });
        await prisma.roles.delete({ where: { id: roleId } });
        revalidatePath("/admin/roles");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ─── Trackers ───

export async function createTrackerAction(data: { name: string; default_status_id: number; is_in_roadmap: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const maxPos = await prisma.trackers.aggregate({ _max: { position: true } });
        await prisma.trackers.create({
            data: { name: data.name, default_status_id: data.default_status_id, is_in_roadmap: data.is_in_roadmap, is_in_chlog: false, position: (maxPos._max.position || 0) + 1 },
        });
        revalidatePath("/admin/trackers");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateTrackerAction(id: number, data: { name?: string; default_status_id?: number; is_in_roadmap?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.trackers.update({ where: { id }, data });
        revalidatePath("/admin/trackers");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteTrackerAction(id: number): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const issueCount = await prisma.issues.count({ where: { tracker_id: id } });
        if (issueCount > 0) return { success: false, error: `Cannot delete: ${issueCount} issues use this tracker` };
        await prisma.trackers.delete({ where: { id } });
        revalidatePath("/admin/trackers");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ─── Issue Statuses ───

export async function createStatusAction(data: { name: string; is_closed: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const maxPos = await prisma.issue_statuses.aggregate({ _max: { position: true } });
        await prisma.issue_statuses.create({
            data: { name: data.name, is_closed: data.is_closed, position: (maxPos._max.position || 0) + 1, default_done_ratio: null },
        });
        revalidatePath("/admin/issue-statuses");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateStatusAction(id: number, data: { name?: string; is_closed?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.issue_statuses.update({ where: { id }, data });
        revalidatePath("/admin/issue-statuses");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteStatusAction(id: number): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const issueCount = await prisma.issues.count({ where: { status_id: id } });
        if (issueCount > 0) return { success: false, error: `Cannot delete: ${issueCount} issues use this status` };
        await prisma.issue_statuses.delete({ where: { id } });
        revalidatePath("/admin/issue-statuses");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ─── Workflows ───

export async function getWorkflowsAction(roleId: number, trackerId: number) {
    const user = await getSession();
    requireAdmin(user);
    return prisma.workflows.findMany({
        where: { role_id: roleId, tracker_id: trackerId, type: "WorkflowTransition" },
        select: { id: true, old_status_id: true, new_status_id: true },
    });
}

export async function updateWorkflowsAction(roleId: number, trackerId: number, transitions: { from: number; to: number }[]): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.workflows.deleteMany({ where: { role_id: roleId, tracker_id: trackerId, type: "WorkflowTransition" } });
        if (transitions.length > 0) {
            await prisma.workflows.createMany({
                data: transitions.map((t) => ({ role_id: roleId, tracker_id: trackerId, old_status_id: t.from, new_status_id: t.to, type: "WorkflowTransition" })),
            });
        }
        revalidatePath("/admin/workflows");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ─── Custom Fields ───

export async function createCustomFieldAction(data: {
    name: string; field_format: string; type: string; is_required: boolean;
    possible_values?: string; default_value?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const maxPos = await prisma.custom_fields.aggregate({ _max: { position: true } });
        await prisma.custom_fields.create({
            data: {
                name: data.name, field_format: data.field_format, type: data.type,
                is_required: data.is_required, possible_values: data.possible_values || "",
                default_value: data.default_value || "", regexp: "", min_length: null, max_length: null,
                is_for_all: false, is_filter: false, searchable: false, editable: true, visible: true, multiple: false,
                position: (maxPos._max.position || 0) + 1,
            },
        });
        revalidatePath("/admin/custom-fields");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateCustomFieldAction(id: number, data: {
    name?: string; field_format?: string; is_required?: boolean;
    possible_values?: string; default_value?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.custom_fields.update({ where: { id }, data });
        revalidatePath("/admin/custom-fields");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ─── Enumerations ───

export async function createEnumerationAction(data: { name: string; type: string; active: boolean; is_default: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const maxPos = await prisma.enumerations.aggregate({ _max: { position: true }, where: { type: data.type } });
        await prisma.enumerations.create({
            data: { name: data.name, type: data.type, active: data.active, is_default: data.is_default, position: (maxPos._max.position || 0) + 1 },
        });
        revalidatePath("/admin/enumerations");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateEnumerationAction(id: number, data: { name?: string; active?: boolean; is_default?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        await prisma.enumerations.update({ where: { id }, data });
        revalidatePath("/admin/enumerations");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ─── Settings ───

export async function getSettingsAction() {
    const user = await getSession();
    requireAdmin(user);
    return prisma.settings.findMany();
}

export async function updateSettingAction(name: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        requireAdmin(user);
        const existing = await prisma.settings.findFirst({ where: { name } });
        if (existing) {
            await prisma.settings.update({ where: { id: existing.id }, data: { value, updated_on: new Date() } });
        } else {
            await prisma.settings.create({ data: { name, value, updated_on: new Date() } });
        }
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}
