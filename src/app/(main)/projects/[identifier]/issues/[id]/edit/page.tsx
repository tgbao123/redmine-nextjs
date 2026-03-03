import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { checkPermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { IssueForm } from "../../new/issue-form";

interface Props {
    params: Promise<{ identifier: string; id: string }>;
}

export default async function EditIssuePage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");

    const { identifier, id } = await params;
    const issueId = parseInt(id);
    if (isNaN(issueId)) notFound();

    const project = await prisma.projects.findFirst({
        where: {
            OR: [
                { identifier },
                { id: parseInt(identifier) || 0 },
            ],
        },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const canEdit = await checkPermission(project.id, Permission.EDIT_ISSUES);
    if (!canEdit) redirect(`/projects/${identifier}/issues/${id}`);

    // Fetch issue
    const issue = await prisma.issues.findFirst({
        where: { id: issueId, project_id: project.id },
    });
    if (!issue) notFound();

    // Fetch form data + custom field values
    const [trackers, statuses, priorities, memberRecords, versions, categories, customFields, customValues, activities, attachments, enabledModules] = await Promise.all([
        prisma.trackers.findMany({ select: { id: true, name: true }, orderBy: { position: "asc" } }),
        prisma.issue_statuses.findMany({ select: { id: true, name: true, is_closed: true }, orderBy: { position: "asc" } }),
        prisma.enumerations.findMany({ where: { type: "IssuePriority", active: true }, select: { id: true, name: true }, orderBy: { position: "asc" } }),
        prisma.members.findMany({ where: { project_id: project.id }, select: { user_id: true } }),
        prisma.versions.findMany({ where: { project_id: project.id }, select: { id: true, name: true }, orderBy: [{ effective_date: "asc" }, { name: "asc" }] }),
        prisma.issue_categories.findMany({ where: { project_id: project.id }, select: { id: true, name: true } }),
        prisma.custom_fields.findMany({ where: { type: "IssueCustomField" }, select: { id: true, name: true, field_format: true, possible_values: true, is_required: true, default_value: true } }),
        prisma.custom_values.findMany({ where: { customized_type: "Issue", customized_id: issueId } }),
        prisma.enumerations.findMany({ where: { type: "TimeEntryActivity", active: true }, select: { id: true, name: true }, orderBy: { position: "asc" } }),
        prisma.attachments.findMany({ where: { container_id: issueId, container_type: "Issue" }, orderBy: { created_on: "asc" }, select: { id: true, filename: true, filesize: true, created_on: true } }),
        prisma.enabled_modules.findMany({ where: { project_id: project.id }, select: { name: true } }),
    ]);

    const memberUsers = await prisma.users.findMany({
        where: { id: { in: memberRecords.map((m) => m.user_id) }, status: 1 },
        select: { id: true, firstname: true, lastname: true, login: true },
    });

    const members = memberUsers.map((u) => ({
        id: u.id,
        name: `${u.firstname} ${u.lastname}`.trim() || u.login,
    }));

    const cfValueMap: Record<number, string> = {};
    for (const cv of customValues) {
        cfValueMap[cv.custom_field_id] = cv.value || "";
    }

    return (
        <IssueForm
            project={project}
            trackers={trackers}
            statuses={statuses}
            priorities={priorities}
            members={members}
            versions={versions}
            categories={categories}
            customFields={customFields.map((cf) => ({
                id: cf.id,
                name: cf.name,
                format: cf.field_format || "string",
                possibleValues: cf.possible_values,
                isRequired: cf.is_required,
                defaultValue: cf.default_value,
            }))}
            defaultStatusId={issue.status_id}
            defaultPriorityId={issue.priority_id}
            defaultTrackerId={issue.tracker_id}
            editMode
            issueId={issue.id}
            activities={activities}
            attachments={attachments.map(a => ({
                id: a.id,
                filename: a.filename,
                filesize: Number(a.filesize),
                createdOn: a.created_on?.toISOString() || "",
            }))}
            modules={enabledModules.map(m => m.name)}
            initialValues={{
                subject: issue.subject,
                description: issue.description || "",
                trackerId: issue.tracker_id,
                statusId: issue.status_id,
                priorityId: issue.priority_id,
                assignedToId: issue.assigned_to_id,
                categoryId: issue.category_id,
                fixedVersionId: issue.fixed_version_id,
                parentId: issue.parent_id,
                startDate: issue.start_date ? issue.start_date.toISOString().split("T")[0] : "",
                dueDate: issue.due_date ? issue.due_date.toISOString().split("T")[0] : "",
                estimatedHours: issue.estimated_hours ? String(issue.estimated_hours) : "",
                doneRatio: issue.done_ratio,
                isPrivate: issue.is_private,
                customFieldValues: cfValueMap,
            }}
        />
    );
}
