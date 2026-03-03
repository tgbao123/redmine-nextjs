import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/projects/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");
    const { id } = await params;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ id: parseInt(id) || 0 }, { identifier: id }] },
        select: { id: true, name: true, identifier: true, description: true, homepage: true, is_public: true, status: true, created_on: true, updated_on: true },
    });
    if (!project) return jsonError("Not found", 404);

    const [trackers, modules] = await Promise.all([
        prisma.projects_trackers.findMany({ where: { project_id: project.id } }),
        prisma.enabled_modules.findMany({ where: { project_id: project.id }, select: { name: true } }),
    ]);

    const trackerData = trackers.length > 0
        ? await prisma.trackers.findMany({ where: { id: { in: trackers.map(t => t.tracker_id) } }, select: { id: true, name: true } })
        : [];

    return jsonOk({
        project: { ...project, trackers: trackerData, enabled_modules: modules.map(m => m.name) },
    });
}

// PUT /api/v1/projects/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user?.admin) return jsonError("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();

    try {
        const project = await prisma.projects.update({
            where: { id: parseInt(id) },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.description !== undefined && { description: body.description }),
                ...(body.is_public !== undefined && { is_public: body.is_public }),
                ...(body.homepage !== undefined && { homepage: body.homepage }),
                updated_on: new Date(),
            },
        });
        return jsonOk({ project: { id: project.id, name: project.name, identifier: project.identifier } });
    } catch (e: any) { return jsonError(e.message, 422); }
}

// DELETE /api/v1/projects/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user?.admin) return jsonError("Forbidden", 403);
    const { id } = await params;

    try {
        await prisma.projects.delete({ where: { id: parseInt(id) } });
        return new Response(null, { status: 204 });
    } catch (e: any) { return jsonError(e.message, 422); }
}
