import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { TimeEntriesList } from "./time-entries-list";

type Props = {
    params: Promise<{ identifier: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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

interface TimeEntryFilters {
    date?: string;
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

async function getTimeEntriesWithIssueFilters(projectId: number, filters: TimeEntryFilters) {
    // First, build a list of issue IDs that match the filters
    const issueWhere: any = { project_id: projectId };

    // Status filter
    if (filters.status !== "*") {
        if (filters.status === "open") {
            const openStatuses = await prisma.issue_statuses.findMany({
                where: { is_closed: false },
                select: { id: true }
            });
            issueWhere.status_id = { in: openStatuses.map(s => s.id) };
        } else {
            const statusIds = filters.status.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            if (statusIds.length > 0) {
                issueWhere.status_id = { in: statusIds };
            }
        }
    }

    // Tracker filter
    if (filters.tracker) {
        const trackerId = parseInt(filters.tracker);
        if (!isNaN(trackerId)) {
            issueWhere.tracker_id = trackerId;
        }
    }

    // Priority filter
    if (filters.priority) {
        const priorityId = parseInt(filters.priority);
        if (!isNaN(priorityId)) {
            issueWhere.priority_id = priorityId;
        }
    }

    // Assignee filter
    if (filters.assignee) {
        const assigneeId = parseInt(filters.assignee);
        if (!isNaN(assigneeId)) {
            issueWhere.assigned_to_id = assigneeId;
        }
    }

    // Version filter
    if (filters.version) {
        const versionIds = filters.version.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (versionIds.length > 0) {
            issueWhere.fixed_version_id = { in: versionIds };
        }
    }

    // Epic filter (custom field ID 3)
    let epicIssueIds: number[] | null = null;
    if (filters.epic) {
        const epicValues = filters.epic.split(",").map(s => s.trim()).filter(Boolean);
        if (epicValues.length > 0) {
            const epicCustomValues = await prisma.custom_values.findMany({
                where: {
                    custom_field_id: 3,
                    customized_type: "Issue",
                    value: { in: epicValues }
                },
                select: { customized_id: true }
            });
            epicIssueIds = epicCustomValues.map(cv => cv.customized_id);
        }
    }

    // Get matching issue IDs
    let matchingIssueIds: number[] | null = null;
    const hasIssueFilters =
        filters.status !== "*" ||
        filters.tracker ||
        filters.priority ||
        filters.assignee ||
        filters.version ||
        filters.epic;

    if (hasIssueFilters) {
        const matchingIssues = await prisma.issues.findMany({
            where: issueWhere,
            select: { id: true }
        });
        matchingIssueIds = matchingIssues.map(i => i.id);

        // If epic filter is set, intersect with epic issue IDs
        if (epicIssueIds !== null) {
            const epicSet = new Set(epicIssueIds);
            matchingIssueIds = matchingIssueIds.filter(id => epicSet.has(id));
        }
    } else if (epicIssueIds !== null) {
        matchingIssueIds = epicIssueIds;
    }

    // Build time entries where clause
    const timeWhere: any = { project_id: projectId };

    if (matchingIssueIds !== null) {
        timeWhere.issue_id = { in: matchingIssueIds };
    }

    // Date filter
    if (filters.date && filters.date !== "any") {
        const now = new Date();
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        switch (filters.date) {
            case "today":
                startDate = new Date(now.toDateString());
                endDate = new Date(now.toDateString());
                endDate.setDate(endDate.getDate() + 1);
                break;
            case "yesterday":
                startDate = new Date(now.toDateString());
                startDate.setDate(startDate.getDate() - 1);
                endDate = new Date(now.toDateString());
                break;
            case "this_week": {
                const day = now.getDay();
                startDate = new Date(now.toDateString());
                startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 7);
                break;
            }
            case "last_week": {
                const day = now.getDay();
                endDate = new Date(now.toDateString());
                endDate.setDate(endDate.getDate() - (day === 0 ? 6 : day - 1));
                startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 7);
                break;
            }
            case "last_2_weeks": {
                endDate = new Date(now.toDateString());
                endDate.setDate(endDate.getDate() + 1);
                startDate = new Date(now.toDateString());
                startDate.setDate(startDate.getDate() - 14);
                break;
            }
            case "this_month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                break;
            case "last_month":
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "this_year":
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear() + 1, 0, 1);
                break;
        }

        if (startDate && endDate) {
            timeWhere.spent_on = {
                gte: startDate,
                lt: endDate
            };
        }
    }

    // Get total count
    const totalCount = await prisma.time_entries.count({ where: timeWhere });

    // Get total hours
    const hoursResult = await prisma.time_entries.aggregate({
        where: timeWhere,
        _sum: { hours: true }
    });
    const totalHours = hoursResult._sum.hours || 0;

    // Get time entries with sorting (with secondary sort for stability)
    let orderBy: any[] = [];

    if (filters.sort === "hours") {
        orderBy = [{ hours: filters.sortDir }, { spent_on: "desc" }, { id: "desc" }];
    } else if (filters.sort === "user") {
        orderBy = [{ user_id: filters.sortDir }, { spent_on: "desc" }, { id: "desc" }];
    } else if (filters.sort === "activity") {
        orderBy = [{ activity_id: filters.sortDir }, { spent_on: "desc" }, { id: "desc" }];
    } else {
        // Default: date sort
        orderBy = [{ spent_on: filters.sortDir }, { id: "desc" }];
    }

    const timeEntries = await prisma.time_entries.findMany({
        where: timeWhere,
        orderBy,
        skip: (filters.page - 1) * filters.perPage,
        take: filters.perPage,
        select: {
            id: true,
            spent_on: true,
            user_id: true,
            activity_id: true,
            issue_id: true,
            comments: true,
            hours: true
        }
    });

    // Get activities
    const activities = await prisma.enumerations.findMany({
        where: { type: "TimeEntryActivity", active: true },
        select: { id: true, name: true },
        orderBy: { position: "asc" }
    });
    const activityMap = new Map(activities.map(a => [a.id, a.name]));

    // Get user info
    const userIds = [...new Set(timeEntries.map(t => t.user_id))];
    const users = await prisma.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstname: true, lastname: true, login: true }
    });
    const userMap = new Map(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim() || u.login]));

    // Get issue info
    const issueIds = timeEntries.map(t => t.issue_id).filter((id): id is number => id !== null);
    const issues = await prisma.issues.findMany({
        where: { id: { in: issueIds } },
        select: { id: true, subject: true, tracker_id: true }
    });

    // Get trackers
    const trackers = await prisma.trackers.findMany({
        select: { id: true, name: true }
    });
    const trackerMap = new Map(trackers.map(t => [t.id, t.name]));
    const issueMap = new Map(issues.map(i => [i.id, { subject: i.subject, tracker: trackerMap.get(i.tracker_id) || "Issue" }]));

    // Get statuses
    const statuses = await prisma.issue_statuses.findMany({
        select: { id: true, name: true, is_closed: true },
        orderBy: { position: "asc" }
    });

    // Get priorities
    const priorities = await prisma.enumerations.findMany({
        where: { type: "IssuePriority", active: true },
        select: { id: true, name: true },
        orderBy: { position: "asc" }
    });

    // Get members
    const members = await prisma.members.findMany({
        where: { project_id: projectId },
        select: { user_id: true }
    });
    const memberUserIds = members.map(m => m.user_id);
    const memberUsers = await prisma.users.findMany({
        where: { id: { in: memberUserIds }, status: 1 },
        select: { id: true, firstname: true, lastname: true, login: true }
    });

    // Get versions
    const versions = await prisma.versions.findMany({
        where: { project_id: projectId },
        select: { id: true, name: true },
        orderBy: { effective_date: "desc" }
    });

    // Get epics (custom field values)
    const projectIssues = await prisma.issues.findMany({
        where: { project_id: projectId },
        select: { id: true }
    });
    const projectIssueIds = projectIssues.map(i => i.id);
    const epicValues = await prisma.custom_values.findMany({
        where: {
            custom_field_id: 3,
            customized_type: "Issue",
            customized_id: { in: projectIssueIds }
        },
        select: { value: true },
        distinct: ["value"]
    });
    const epics = epicValues.map(e => e.value).filter((v): v is string => v !== null && v.length > 0);

    // Transform time entries
    const transformedEntries = timeEntries.map(entry => {
        const issue = entry.issue_id ? issueMap.get(entry.issue_id) : null;
        return {
            id: entry.id,
            date: entry.spent_on,
            userId: entry.user_id,
            userName: userMap.get(entry.user_id) || "Unknown",
            activity: activityMap.get(entry.activity_id) || "Unknown",
            issueId: entry.issue_id,
            issueSubject: issue?.subject || null,
            issueTracker: issue?.tracker || null,
            comments: entry.comments,
            hours: entry.hours
        };
    });

    return {
        timeEntries: transformedEntries,
        totalCount,
        totalHours,
        trackers,
        statuses,
        priorities,
        members: memberUsers.map(u => ({
            id: u.id,
            name: `${u.firstname} ${u.lastname}`.trim() || u.login
        })),
        versions,
        epics,
        activities
    };
}

export default async function ProjectTimeEntriesPage({ params, searchParams }: Props) {
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

    // Parse filters (same as Issues page)
    const filters: TimeEntryFilters = {
        date: (query.date as string) || undefined,
        status: (query.status as string) || "open",
        tracker: query.tracker as string | undefined,
        priority: query.priority as string | undefined,
        assignee: query.assignee as string | undefined,
        version: query.version as string | undefined,
        epic: query.epic as string | undefined,
        page: parseInt(query.page as string) || 1,
        perPage: parseInt(query.per_page as string) || 25,
        sort: (query.sort as string) || "date",
        sortDir: ((query.sort_dir as string) || "desc") as "asc" | "desc"
    };

    const {
        timeEntries,
        totalCount,
        totalHours,
        trackers,
        statuses,
        priorities,
        members,
        versions,
        epics,
        activities
    } = await getTimeEntriesWithIssueFilters(project.id, filters);

    const enabledModules = await prisma.enabled_modules.findMany({
        where: { project_id: project.id },
        select: { name: true }
    });

    return (
        <TimeEntriesList
            project={project}
            timeEntries={timeEntries}
            totalCount={totalCount}
            totalHours={totalHours}
            trackers={trackers}
            statuses={statuses}
            priorities={priorities}
            members={members}
            versions={versions}
            epics={epics}
            activities={activities}
            filters={filters}
            modules={enabledModules.map(m => m.name)}
        />
    );
}
