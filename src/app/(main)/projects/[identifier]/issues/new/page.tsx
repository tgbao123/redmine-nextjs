import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { checkPermission } from "@/lib/permissions";
import { Permission } from "@/lib/permissions/constants";
import { IssueForm } from "./issue-form";

interface Props {
    params: Promise<{ identifier: string }>;
}

export default async function NewIssuePage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");

    const { identifier } = await params;

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

    // Permission check
    const canAdd = await checkPermission(project.id, Permission.ADD_ISSUES);
    if (!canAdd) redirect(`/projects/${identifier}/issues`);

    // Fetch form data
    const [trackers, statuses, priorities, memberRecords, versions, categories, customFields] = await Promise.all([
        prisma.trackers.findMany({ select: { id: true, name: true }, orderBy: { position: "asc" } }),
        prisma.issue_statuses.findMany({ select: { id: true, name: true, is_closed: true }, orderBy: { position: "asc" } }),
        prisma.enumerations.findMany({ where: { type: "IssuePriority", active: true }, select: { id: true, name: true }, orderBy: { position: "asc" } }),
        prisma.members.findMany({ where: { project_id: project.id }, select: { user_id: true } }),
        prisma.versions.findMany({ where: { project_id: project.id, status: "open" }, select: { id: true, name: true }, orderBy: [{ effective_date: "asc" }, { name: "asc" }] }),
        prisma.issue_categories.findMany({ where: { project_id: project.id }, select: { id: true, name: true } }),
        prisma.custom_fields.findMany({ where: { type: "IssueCustomField" }, select: { id: true, name: true, field_format: true, possible_values: true, is_required: true, default_value: true } }),
    ]);

    // Resolve member names
    const memberUsers = await prisma.users.findMany({
        where: { id: { in: memberRecords.map((m) => m.user_id) }, status: 1 },
        select: { id: true, firstname: true, lastname: true, login: true },
    });

    const members = memberUsers.map((u) => ({
        id: u.id,
        name: `${u.firstname} ${u.lastname}`.trim() || u.login,
    }));

    // Default status = first non-closed
    const defaultStatus = statuses.find((s) => !s.is_closed) || statuses[0];
    // Default priority = "Normal" or middle
    const defaultPriority = priorities.find((p) => p.name === "Normal") || priorities[Math.floor(priorities.length / 2)];

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
            defaultStatusId={defaultStatus?.id || 1}
            defaultPriorityId={defaultPriority?.id || 4}
            defaultTrackerId={trackers[0]?.id || 1}
        />
    );
}
