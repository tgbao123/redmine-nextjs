import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/issue_statuses
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const statuses = await prisma.issue_statuses.findMany({
        orderBy: { position: "asc" },
        select: { id: true, name: true, is_closed: true },
    });

    return jsonOk({ issue_statuses: statuses });
}
