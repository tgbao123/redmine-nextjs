import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/users.json
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");
    if (!user.admin) return jsonError("Forbidden", 403);

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
    const status = url.searchParams.get("status");

    const where: any = { type: "User" };
    if (status) where.status = parseInt(status);

    const [users, totalCount] = await Promise.all([
        prisma.users.findMany({
            where, orderBy: { login: "asc" }, skip: offset, take: limit,
            select: { id: true, login: true, firstname: true, lastname: true, mail: true, admin: true, status: true, created_on: true, last_login_on: true }
        }),
        prisma.users.count({ where }),
    ]);

    return jsonOk({
        users: users.map(u => ({ id: u.id, login: u.login, firstname: u.firstname, lastname: u.lastname, mail: u.mail, admin: u.admin, status: u.status, created_on: u.created_on, last_login_on: u.last_login_on })),
        total_count: totalCount, offset, limit,
    });
}
