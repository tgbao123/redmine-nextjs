import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/projects.json
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);

    let where: any = { status: 1 };
    if (!user.admin) {
        const memberships = await prisma.members.findMany({ where: { user_id: user.id }, select: { project_id: true } });
        const publicIds = (await prisma.projects.findMany({ where: { status: 1, is_public: true }, select: { id: true } })).map(p => p.id);
        where.id = { in: [...new Set([...memberships.map(m => m.project_id), ...publicIds])] };
    }

    const [projects, totalCount] = await Promise.all([
        prisma.projects.findMany({
            where, orderBy: { name: "asc" }, skip: offset, take: limit,
            select: { id: true, name: true, identifier: true, description: true, status: true, is_public: true, created_on: true, updated_on: true }
        }),
        prisma.projects.count({ where }),
    ]);

    return jsonOk({
        projects: projects.map(p => ({ id: p.id, name: p.name, identifier: p.identifier, description: p.description || "", status: p.status, is_public: p.is_public, created_on: p.created_on, updated_on: p.updated_on })),
        total_count: totalCount, offset, limit,
    });
}
