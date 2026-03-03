import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/versions?project_id=...
export async function GET(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");

    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");
    if (!projectId) return jsonError("project_id required", 400);

    const versions = await prisma.versions.findMany({
        where: { project_id: parseInt(projectId) },
        orderBy: { effective_date: "asc" },
        select: { id: true, name: true, description: true, status: true, effective_date: true, sharing: true, created_on: true, updated_on: true },
    });

    return jsonOk({ versions });
}

// POST /api/v1/versions
export async function POST(req: NextRequest) {
    const user = await authenticateApiRequest(req);
    if (!user?.admin) return jsonError("Forbidden", 403);
    const body = await req.json();
    const { project_id, name, description, status, effective_date, sharing } = body.version || {};

    if (!project_id || !name) return jsonError("project_id and name required", 422);

    try {
        const version = await prisma.versions.create({
            data: { project_id, name, description: description || "", status: status || "open", effective_date: effective_date ? new Date(effective_date) : null, sharing: sharing || "none", created_on: new Date(), updated_on: new Date() },
        });
        return jsonOk({ version });
    } catch (e: any) { return jsonError(e.message, 422); }
}
