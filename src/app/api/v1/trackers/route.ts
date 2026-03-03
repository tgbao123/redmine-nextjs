import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/trackers
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const trackers = await prisma.trackers.findMany({
        orderBy: { position: "asc" },
        select: { id: true, name: true, default_status_id: true },
    });

    return jsonOk({ trackers });
}
