import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/versions/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");
    const { id } = await params;

    const version = await prisma.versions.findFirst({ where: { id: parseInt(id) } });
    if (!version) return jsonError("Not found", 404);

    return jsonOk({ version });
}

// PUT /api/v1/versions/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user?.admin) return jsonError("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();

    try {
        const version = await prisma.versions.update({
            where: { id: parseInt(id) },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.description !== undefined && { description: body.description }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.effective_date !== undefined && { effective_date: body.effective_date ? new Date(body.effective_date) : null }),
                updated_on: new Date(),
            },
        });
        return jsonOk({ version });
    } catch (e: any) { return jsonError(e.message, 422); }
}

// DELETE /api/v1/versions/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user?.admin) return jsonError("Forbidden", 403);
    const { id } = await params;

    try {
        await prisma.versions.delete({ where: { id: parseInt(id) } });
        return new Response(null, { status: 204 });
    } catch (e: any) { return jsonError(e.message, 422); }
}
