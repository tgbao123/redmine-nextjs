import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getUserPermissions } from "@/lib/permissions";
import { IssueDetail } from "./issue-detail";

interface Props {
    params: Promise<{ identifier: string; id: string }>;
}

export default async function IssueDetailPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");

    const { identifier, id } = await params;
    const issueId = parseInt(id);
    if (isNaN(issueId)) notFound();

    // Fetch project
    const project = await prisma.projects.findFirst({
        where: {
            OR: [
                { identifier },
                { id: parseInt(identifier) || 0 },
            ],
        },
        select: { id: true, name: true, identifier: true, is_public: true },
    });
    if (!project) notFound();

    // Access check
    if (!user.admin && !project.is_public) {
        const membership = await prisma.members.findFirst({
            where: { project_id: project.id, user_id: user.id },
        });
        if (!membership) notFound();
    }

    // Fetch issue with all data
    const issue = await prisma.issues.findFirst({
        where: { id: issueId, project_id: project.id },
    });
    if (!issue) notFound();

    // Parallel fetch for all related data
    const [
        tracker,
        status,
        priority,
        author,
        assignee,
        category,
        version,
        parentIssue,
        childIssues,
        journals,
        customValues,
        customFields,
        relations,
        watchers,
        timeEntries,
        statuses,
        trackers,
        priorities,
        members,
        versions,
        categories,
        permissions,
        enabledModules,
    ] = await Promise.all([
        prisma.trackers.findFirst({ where: { id: issue.tracker_id } }),
        prisma.issue_statuses.findFirst({ where: { id: issue.status_id } }),
        prisma.enumerations.findFirst({ where: { id: issue.priority_id } }),
        prisma.users.findFirst({ where: { id: issue.author_id || 0 }, select: { id: true, firstname: true, lastname: true, login: true } }),
        issue.assigned_to_id ? prisma.users.findFirst({ where: { id: issue.assigned_to_id }, select: { id: true, firstname: true, lastname: true, login: true } }) : null,
        issue.category_id ? prisma.issue_categories.findFirst({ where: { id: issue.category_id } }) : null,
        issue.fixed_version_id ? prisma.versions.findFirst({ where: { id: issue.fixed_version_id } }) : null,
        issue.parent_id ? prisma.issues.findFirst({ where: { id: issue.parent_id }, select: { id: true, subject: true, tracker_id: true, status_id: true } }) : null,
        prisma.issues.findMany({ where: { parent_id: issueId }, select: { id: true, subject: true, tracker_id: true, status_id: true, assigned_to_id: true, done_ratio: true }, orderBy: { id: "asc" } }),
        // Journals with details
        prisma.journals.findMany({
            where: { journalized_id: issueId, journalized_type: "Issue" },
            orderBy: { created_on: "asc" },
        }),
        prisma.custom_values.findMany({ where: { customized_type: "Issue", customized_id: issueId } }),
        prisma.custom_fields.findMany({ where: { type: "IssueCustomField" }, select: { id: true, name: true, field_format: true } }),
        prisma.issue_relations.findMany({ where: { OR: [{ issue_from_id: issueId }, { issue_to_id: issueId }] } }),
        prisma.watchers.findMany({ where: { watchable_type: "Issue", watchable_id: issueId } }),
        // Spent time aggregate
        prisma.time_entries.aggregate({ where: { issue_id: issueId }, _sum: { hours: true } }),
        // Lookups for edit form
        prisma.issue_statuses.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true, is_closed: true } }),
        prisma.trackers.findMany({ select: { id: true, name: true } }),
        prisma.enumerations.findMany({ where: { type: "IssuePriority", active: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
        // Project members for assignee
        prisma.members.findMany({ where: { project_id: project.id }, select: { user_id: true } }),
        prisma.versions.findMany({ where: { project_id: project.id }, select: { id: true, name: true }, orderBy: [{ effective_date: "asc" }, { name: "asc" }] }),
        prisma.issue_categories.findMany({ where: { project_id: project.id }, select: { id: true, name: true } }),
        // User permissions
        getUserPermissions(user.id, project.id, user.admin),
        prisma.enabled_modules.findMany({ where: { project_id: project.id }, select: { name: true } }),
    ]);

    // Fetch journal details
    const journalIds = journals.map((j) => j.id);
    const journalDetails = journalIds.length > 0
        ? await prisma.journal_details.findMany({ where: { journal_id: { in: journalIds } } })
        : [];

    // Fetch journal authors and watcher users
    const allUserIds = [
        ...new Set([
            ...journals.map((j) => j.user_id),
            ...watchers.map((w) => w.user_id).filter((id): id is number => id !== null),
            ...members.map((m) => m.user_id),
        ].filter((id): id is number => id !== null)),
    ];
    const allUsers = await prisma.users.findMany({
        where: { id: { in: allUserIds }, status: 1 },
        select: { id: true, firstname: true, lastname: true, login: true },
    });
    const userMap = Object.fromEntries(
        allUsers.map((u) => [u.id, { id: u.id, name: `${u.firstname} ${u.lastname}`.trim() || u.login }])
    );

    // Fetch related issues info
    const relatedIssueIds = relations.map((r) => r.issue_from_id === issueId ? r.issue_to_id : r.issue_from_id);
    const relatedIssues = relatedIssueIds.length > 0
        ? await prisma.issues.findMany({
            where: { id: { in: relatedIssueIds } },
            select: { id: true, subject: true, tracker_id: true, status_id: true },
        })
        : [];

    // Custom field map
    const cfMap = Object.fromEntries(customFields.map((cf) => [cf.id, cf]));

    // Tracker/status maps for sub-issues and parent
    const trackerMap = Object.fromEntries(trackers.map((t) => [t.id, t.name]));
    const statusMap = Object.fromEntries(statuses.map((s) => [s.id, { name: s.name, isClosed: s.is_closed }]));

    // Transform data
    const issueData = {
        id: issue.id,
        subject: issue.subject,
        description: issue.description || "",
        tracker: { id: issue.tracker_id, name: tracker?.name || "" },
        status: { id: issue.status_id, name: status?.name || "", isClosed: status?.is_closed || false },
        priority: { id: issue.priority_id, name: priority?.name || "" },
        author: author ? { id: author.id, name: `${author.firstname} ${author.lastname}`.trim() || author.login } : null,
        assignee: assignee ? { id: assignee.id, name: `${assignee.firstname} ${assignee.lastname}`.trim() || assignee.login } : null,
        category: category ? { id: category.id, name: category.name } : null,
        version: version ? { id: version.id, name: version.name } : null,
        parentIssue: parentIssue ? {
            id: parentIssue.id,
            subject: parentIssue.subject,
            tracker: trackerMap[parentIssue.tracker_id] || "",
            status: statusMap[parentIssue.status_id]?.name || "",
        } : null,
        startDate: issue.start_date?.toISOString().split("T")[0] || null,
        dueDate: issue.due_date?.toISOString().split("T")[0] || null,
        estimatedHours: Number(issue.estimated_hours) || null,
        doneRatio: issue.done_ratio,
        isPrivate: issue.is_private,
        createdOn: issue.created_on?.toISOString() || "",
        updatedOn: issue.updated_on?.toISOString() || "",
        spentHours: Number(timeEntries._sum.hours) || 0,
    };

    const childIssueData = childIssues.map((ci) => ({
        id: ci.id,
        subject: ci.subject,
        tracker: trackerMap[ci.tracker_id] || "",
        status: statusMap[ci.status_id]?.name || "",
        isClosed: statusMap[ci.status_id]?.isClosed || false,
        assignee: ci.assigned_to_id ? userMap[ci.assigned_to_id]?.name || "" : "",
        doneRatio: ci.done_ratio,
    }));

    const relationsData = relations.map((r) => {
        const otherId = r.issue_from_id === issueId ? r.issue_to_id : r.issue_from_id;
        const otherIssue = relatedIssues.find((ri) => ri.id === otherId);
        return {
            id: r.id,
            relationType: r.relation_type || "",
            delay: r.delay,
            otherIssue: otherIssue ? {
                id: otherIssue.id,
                subject: otherIssue.subject,
                tracker: trackerMap[otherIssue.tracker_id] || "",
                status: statusMap[otherIssue.status_id]?.name || "",
                isClosed: statusMap[otherIssue.status_id]?.isClosed || false,
            } : null,
            isFrom: r.issue_from_id === issueId,
        };
    });

    const journalData = journals.map((j) => ({
        id: j.id,
        notes: j.notes || "",
        privateNotes: j.private_notes,
        author: userMap[j.user_id] || { id: j.user_id, name: "Unknown" },
        createdOn: j.created_on?.toISOString() || "",
        details: journalDetails
            .filter((jd) => jd.journal_id === j.id)
            .map((jd) => ({
                property: jd.property,
                propKey: jd.prop_key,
                oldValue: jd.old_value,
                newValue: jd.value,
            })),
    }));

    const customFieldsData = customValues
        .filter((cv) => cfMap[cv.custom_field_id])
        .map((cv) => ({
            id: cv.custom_field_id,
            name: cfMap[cv.custom_field_id].name,
            format: cfMap[cv.custom_field_id].field_format || "string",
            value: cv.value || "",
        }));

    const watcherData = watchers.map((w) => userMap[w.user_id ?? 0] || { id: w.user_id ?? 0, name: "Unknown" });

    const memberData = allUsers
        .filter((u) => members.some((m) => m.user_id === u.id))
        .map((u) => ({ id: u.id, name: `${u.firstname} ${u.lastname}`.trim() || u.login }));

    return (
        <IssueDetail
            project={project}
            issue={issueData}
            childIssues={childIssueData}
            relations={relationsData}
            journals={journalData}
            customFields={customFieldsData}
            watchers={watcherData}
            statuses={statuses}
            trackers={trackers}
            priorities={priorities}
            members={memberData}
            versions={versions}
            categories={categories}
            permissions={Array.from(permissions)}
            isAdmin={user.admin}
            currentUserId={user.id}
            modules={enabledModules.map((m) => m.name)}
        />
    );
}
