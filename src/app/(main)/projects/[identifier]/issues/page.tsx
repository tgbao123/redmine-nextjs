import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { IssuesList } from "./issues-list";

interface Props {
    params: Promise<{ identifier: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getProject(identifier: string, userId: number, isAdmin: boolean) {
    const project = await prisma.projects.findFirst({
        where: {
            OR: [
                { identifier },
                { id: parseInt(identifier) || 0 }
            ]
        },
        select: {
            id: true,
            name: true,
            identifier: true,
            is_public: true,
        }
    });

    if (!project) return null;

    if (!isAdmin && !project.is_public) {
        const membership = await prisma.members.findFirst({
            where: { project_id: project.id, user_id: userId }
        });
        if (!membership) return null;
    }

    return project;
}

interface IssueFilters {
    status: string;
    tracker?: string;
    priority?: string;
    assignee?: string;
    version?: string;
    epic?: string;
    page: number;
    perPage: number;
    sort: string;
    sortDir: "asc" | "desc";
}

async function getIssues(projectId: number, filters: IssueFilters) {
    // Get all trackers
    const trackers = await prisma.trackers.findMany({
        select: { id: true, name: true }
    });
    const trackerMap = new Map(trackers.map(t => [t.id, t.name]));

    // Get all statuses
    const statuses = await prisma.issue_statuses.findMany({
        select: { id: true, name: true, is_closed: true },
        orderBy: { position: "asc" }
    });
    const statusMap = new Map(statuses.map(s => [s.id, { name: s.name, isClosed: s.is_closed }]));

    // Get all priorities
    const priorities = await prisma.enumerations.findMany({
        where: { type: "IssuePriority", active: true },
        select: { id: true, name: true },
        orderBy: { position: "asc" }
    });
    const priorityMap = new Map(priorities.map(p => [p.id, p.name]));

    // Build where clause
    const whereClause: any = {
        project_id: projectId
    };

    // Status filter - supports: open, closed, *, specific IDs, or !IDs (is not)
    const isNot = filters.status.startsWith("!");
    const statusValue = isNot ? filters.status.slice(1) : filters.status;

    if (statusValue === "open") {
        const openStatusIds = statuses.filter(s => !s.is_closed).map(s => s.id);
        whereClause.status_id = isNot ? { notIn: openStatusIds } : { in: openStatusIds };
    } else if (statusValue === "closed") {
        const closedStatusIds = statuses.filter(s => s.is_closed).map(s => s.id);
        whereClause.status_id = isNot ? { notIn: closedStatusIds } : { in: closedStatusIds };
    } else if (statusValue !== "all" && statusValue !== "*") {
        // Handle comma-separated status IDs
        const statusIds = statusValue.split(",").map(s => parseInt(s.trim())).filter(id => !isNaN(id));
        if (statusIds.length > 0) {
            whereClause.status_id = isNot ? { notIn: statusIds } : { in: statusIds };
        }
    }

    // Tracker filter
    if (filters.tracker) {
        const trackerId = parseInt(filters.tracker);
        if (!isNaN(trackerId)) {
            whereClause.tracker_id = trackerId;
        }
    }

    // Priority filter
    if (filters.priority) {
        const priorityId = parseInt(filters.priority);
        if (!isNaN(priorityId)) {
            whereClause.priority_id = priorityId;
        }
    }

    // Assignee filter
    if (filters.assignee) {
        const assigneeId = parseInt(filters.assignee);
        if (!isNaN(assigneeId)) {
            whereClause.assigned_to_id = assigneeId;
        }
    }

    // Target version filter
    if (filters.version) {
        const versionIds = filters.version.split(",").map(s => parseInt(s.trim())).filter(id => !isNaN(id));
        if (versionIds.length > 0) {
            whereClause.fixed_version_id = { in: versionIds };
        }
    }

    // Epic filter (custom field id = 3)
    let epicIssueIds: number[] | null = null;
    if (filters.epic) {
        const epicValues = filters.epic.split(",");
        const epicCustomValues = await prisma.custom_values.findMany({
            where: {
                custom_field_id: 3,
                customized_type: "Issue",
                value: { in: epicValues }
            },
            select: { customized_id: true }
        });
        epicIssueIds = epicCustomValues.map(cv => cv.customized_id);
        whereClause.id = { in: epicIssueIds };
    }

    // Get total count
    const totalCount = await prisma.issues.count({ where: whereClause });

    // Build orderBy based on sort field
    const sortFieldMap: Record<string, string> = {
        id: "id",
        tracker: "tracker_id",
        status: "status_id",
        priority: "priority_id",
        subject: "subject",
        assignee: "assigned_to_id",
        updated: "updated_on",
        due_date: "due_date",
        done_ratio: "done_ratio"
    };
    const orderField = sortFieldMap[filters.sort] || "id";

    // Get issues with pagination
    const issues = await prisma.issues.findMany({
        where: whereClause,
        orderBy: { [orderField]: filters.sortDir },
        skip: (filters.page - 1) * filters.perPage,
        take: filters.perPage,
        select: {
            id: true,
            subject: true,
            tracker_id: true,
            status_id: true,
            priority_id: true,
            assigned_to_id: true,
            due_date: true,
            done_ratio: true,
            updated_on: true,
            description: true
        }
    });

    // Get assignee info
    const assigneeIds = issues.map(i => i.assigned_to_id).filter((id): id is number => id !== null);
    const users = await prisma.users.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, firstname: true, lastname: true, login: true }
    });
    const userMap = new Map(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim() || u.login]));

    // Get members for assignee filter
    const members = await prisma.members.findMany({
        where: { project_id: projectId },
        select: { user_id: true }
    });
    const memberUserIds = members.map(m => m.user_id);
    const memberUsers = await prisma.users.findMany({
        where: { id: { in: memberUserIds }, status: 1 },
        select: { id: true, firstname: true, lastname: true, login: true }
    });

    // Transform issues
    const transformedIssues = issues.map(issue => ({
        id: issue.id,
        subject: issue.subject,
        trackerName: trackerMap.get(issue.tracker_id) || "Unknown",
        trackerId: issue.tracker_id,
        statusName: statusMap.get(issue.status_id)?.name || "Unknown",
        statusId: issue.status_id,
        isClosed: statusMap.get(issue.status_id)?.isClosed || false,
        priorityName: priorityMap.get(issue.priority_id) || "Normal",
        priorityId: issue.priority_id,
        assignee: issue.assigned_to_id ? userMap.get(issue.assigned_to_id) || "" : "",
        assigneeId: issue.assigned_to_id,
        dueDate: issue.due_date,
        doneRatio: issue.done_ratio,
        updatedOn: issue.updated_on
    }));

    return {
        issues: transformedIssues,
        totalCount,
        trackers,
        statuses,
        priorities,
        members: memberUsers.map(u => ({
            id: u.id,
            name: `${u.firstname} ${u.lastname}`.trim() || u.login
        }))
    };
}

async function getVersions(projectId: number) {
    return prisma.versions.findMany({
        where: { project_id: projectId },
        select: { id: true, name: true },
        orderBy: [{ effective_date: "asc" }, { name: "asc" }]
    });
}

async function getEpics(projectId: number) {
    // Get issue IDs for this project
    const projectIssues = await prisma.issues.findMany({
        where: { project_id: projectId },
        select: { id: true }
    });
    const issueIds = projectIssues.map(i => i.id);

    // Get distinct Epic values for these issues
    const epicValues = await prisma.custom_values.findMany({
        where: {
            custom_field_id: 3,
            customized_type: "Issue",
            customized_id: { in: issueIds },
            value: { not: "" }
        },
        select: { value: true },
        distinct: ["value"]
    });

    return epicValues
        .filter(e => e.value !== null && e.value.trim() !== "")
        .map(e => e.value as string)
        .sort();
}

export default async function ProjectIssuesPage({ params, searchParams }: Props) {
    const user = await getSession();

    if (!user) {
        redirect("/login");
    }

    const { identifier } = await params;
    const query = await searchParams;

    const project = await getProject(identifier, user.id, user.admin);

    if (!project) {
        notFound();
    }

    // Parse filters
    const filters: IssueFilters = {
        status: (query.status as string) || "open",
        tracker: query.tracker as string | undefined,
        priority: query.priority as string | undefined,
        assignee: query.assignee as string | undefined,
        version: query.version as string | undefined,
        epic: query.epic as string | undefined,
        page: parseInt(query.page as string) || 1,
        perPage: parseInt(query.per_page as string) || 25,
        sort: (query.sort as string) || "id",
        sortDir: ((query.dir as string) || "desc") as "asc" | "desc"
    };

    const [issuesData, versions, epics, enabledModules] = await Promise.all([
        getIssues(project.id, filters),
        getVersions(project.id),
        getEpics(project.id),
        prisma.enabled_modules.findMany({
            where: { project_id: project.id },
            select: { name: true }
        })
    ]);

    const { issues, totalCount, trackers, statuses, priorities, members } = issuesData;

    return (
        <IssuesList
            project={project}
            issues={issues}
            totalCount={totalCount}
            trackers={trackers}
            statuses={statuses}
            priorities={priorities}
            members={members}
            versions={versions}
            epics={epics}
            filters={filters}
            modules={enabledModules.map(m => m.name)}
        />
    );
}
