import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/projects/:id/memberships
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");
    const { id } = await params;
    const projectId = parseInt(id);

    const members = await prisma.members.findMany({
        where: { project_id: projectId },
        select: { id: true, user_id: true, created_on: true },
    });

    const userIds = members.map(m => m.user_id);
    const memberIds = members.map(m => m.id);

    const [users, memberRoles] = await Promise.all([
        userIds.length > 0 ? prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, login: true, firstname: true, lastname: true } }) : [],
        memberIds.length > 0 ? prisma.member_roles.findMany({ where: { member_id: { in: memberIds } } }) : [],
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const rolesMap: Record<number, number[]> = {};
    memberRoles.forEach(mr => { if (!rolesMap[mr.member_id]) rolesMap[mr.member_id] = []; rolesMap[mr.member_id].push(mr.role_id); });

    const roles = await prisma.roles.findMany({ select: { id: true, name: true } });
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

    return jsonOk({
        memberships: members.map(m => ({
            id: m.id,
            user: userMap[m.user_id] ? { id: m.user_id, name: `${userMap[m.user_id].firstname} ${userMap[m.user_id].lastname}`.trim() || userMap[m.user_id].login } : null,
            roles: (rolesMap[m.id] || []).map(rId => ({ id: rId, name: roleMap[rId] || "" })),
        })),
    });
}

// POST /api/v1/projects/:id/memberships
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user?.admin) return jsonError("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();
    const { user_id, role_ids } = body.membership || {};

    if (!user_id || !role_ids?.length) return jsonError("user_id and role_ids required", 422);

    try {
        const member = await prisma.members.create({
            data: { project_id: parseInt(id), user_id: user_id, created_on: new Date() },
        });
        await prisma.member_roles.createMany({
            data: role_ids.map((rid: number) => ({ member_id: member.id, role_id: rid })),
        });
        return jsonOk({ membership: { id: member.id, user_id, role_ids } });
    } catch (e: any) { return jsonError(e.message, 422); }
}
