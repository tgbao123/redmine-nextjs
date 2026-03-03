import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";
import { authenticateApiRequest, jsonError, jsonOk } from "@/lib/api/auth";

// GET /api/v1/issues/:id.json
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");
    const { id } = await params;
    const issueId = parseInt(id);

    const issue = await prisma.issues.findFirst({ where: { id: issueId } });
    if (!issue) return jsonError("Not found", 404);

    const include = new URL(req.url).searchParams.get("include") || "";
    const result: any = {
        id: issue.id, project: { id: issue.project_id }, tracker: { id: issue.tracker_id }, status: { id: issue.status_id },
        priority: { id: issue.priority_id }, author: { id: issue.author_id }, assigned_to: issue.assigned_to_id ? { id: issue.assigned_to_id } : null,
        subject: issue.subject, description: issue.description || "", start_date: issue.start_date, due_date: issue.due_date,
        done_ratio: issue.done_ratio, estimated_hours: issue.estimated_hours ? Number(issue.estimated_hours) : null,
        created_on: issue.created_on, updated_on: issue.updated_on,
    };

    if (include.includes("journals")) {
        const journals = await prisma.journals.findMany({ where: { journalized_id: issueId, journalized_type: "Issue" }, orderBy: { created_on: "asc" } });
        const details = journals.length > 0 ? await prisma.journal_details.findMany({ where: { journal_id: { in: journals.map(j => j.id) } } }) : [];
        result.journals = journals.map(j => ({
            id: j.id, user: { id: j.user_id }, notes: j.notes || "", created_on: j.created_on,
            details: details.filter(d => d.journal_id === j.id).map(d => ({ property: d.property, name: d.prop_key, old_value: d.old_value, new_value: d.value })),
        }));
    }

    return jsonOk({ issue: result });
}

// PUT /api/v1/issues/:id.json
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");
    const { id } = await params;
    const issueId = parseInt(id);

    try {
        const body = await req.json();
        const data: any = { updated_on: new Date() };
        const issue = body.issue || {};

        if (issue.subject !== undefined) data.subject = issue.subject;
        if (issue.description !== undefined) data.description = issue.description;
        if (issue.tracker_id !== undefined) data.tracker_id = issue.tracker_id;
        if (issue.status_id !== undefined) data.status_id = issue.status_id;
        if (issue.priority_id !== undefined) data.priority_id = issue.priority_id;
        if (issue.assigned_to_id !== undefined) data.assigned_to_id = issue.assigned_to_id || null;
        if (issue.done_ratio !== undefined) data.done_ratio = issue.done_ratio;

        await prisma.issues.update({ where: { id: issueId }, data });

        if (issue.notes) {
            await prisma.journals.create({
                data: { journalized_id: issueId, journalized_type: "Issue", user_id: user.id, notes: issue.notes, created_on: new Date() },
            });
        }

        return jsonOk({});
    } catch (e: any) { return jsonError(e.message, 500); }
}

// DELETE /api/v1/issues/:id.json
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticateApiRequest(req);
    if (!user) return jsonError("Unauthorized");
    const { id } = await params;

    try {
        await prisma.issues.delete({ where: { id: parseInt(id) } });
        return jsonOk({});
    } catch (e: any) { return jsonError(e.message, 500); }
}
