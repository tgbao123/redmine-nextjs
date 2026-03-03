import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/roles
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const roles = await prisma.roles.findMany({
        orderBy: { position: "asc" },
        select: { id: true, name: true, builtin: true },
    });

    return jsonOk({ roles: roles.filter(r => r.builtin === 0) });
}
