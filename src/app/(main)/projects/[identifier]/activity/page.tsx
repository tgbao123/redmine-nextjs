import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { ActivityList } from "./activity-list";

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

interface ActivityItem {
    id: number;
    type: "issue_created" | "issue_status" | "time_entry" | "wiki_edit";
    issueId: number;
    subject: string;
    trackerName: string;
    statusName: string;
    author: string;
    authorId: number;
    createdAt: Date;
    projectName: string;
    projectIdentifier: string;
    notes: string | null;
    hours: number | null;
    isRoot: boolean;
}

async function getActivities(projectId: number, filters: string[], includeSubprojects: boolean, daysBack: number = 30) {
    const activities: ActivityItem[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get project IDs (including subprojects if enabled)
    let projectIds = [projectId];
    if (includeSubprojects) {
        const subprojects = await prisma.projects.findMany({
            where: { parent_id: projectId, status: 1 },
            select: { id: true }
        });
        projectIds = [...projectIds, ...subprojects.map(p => p.id)];
    }

    // Get project info
    const projects = await prisma.projects.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true, identifier: true }
    });
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Get all statuses
    const statuses = await prisma.issue_statuses.findMany({
        select: { id: true, name: true }
    });
    const statusMap = new Map(statuses.map(s => [s.id, s.name]));

    // Get all trackers
    const trackers = await prisma.trackers.findMany({
        select: { id: true, name: true }
    });
    const trackerMap = new Map(trackers.map(t => [t.id, t.name]));

    // Get all users we'll need
    const allUserIds = new Set<number>();

    if (filters.includes("issues")) {
        // Get issues in these projects that were updated in the date range
        const issues = await prisma.issues.findMany({
            where: {
                project_id: { in: projectIds },
                updated_on: { gte: startDate }
            },
            select: {
                id: true,
                subject: true,
                project_id: true,
                tracker_id: true,
                status_id: true,
                author_id: true,
                created_on: true
            }
        });
        const issueIds = issues.map(i => i.id);
        const issueMap = new Map(issues.map(i => [i.id, i]));

        // Add issue authors
        issues.forEach(i => allUserIds.add(i.author_id));

        // Get journals for issues
        const journals = await prisma.journals.findMany({
            where: {
                journalized_type: "Issue",
                journalized_id: { in: issueIds },
                created_on: { gte: startDate }
            },
            select: {
                id: true,
                journalized_id: true,
                user_id: true,
                notes: true,
                created_on: true
            },
            orderBy: { created_on: "desc" },
            take: 500
        });

        journals.forEach(j => allUserIds.add(j.user_id));

        // Get journal_details for status changes
        const journalIds = journals.map(j => j.id);
        const journalDetails = await prisma.journal_details.findMany({
            where: {
                journal_id: { in: journalIds },
                prop_key: "status_id"
            },
            select: {
                journal_id: true,
                old_value: true,
                value: true
            }
        });
        const statusChangeMap = new Map(journalDetails.map(d => [d.journal_id, d.value]));

        // Add journal entries
        for (const journal of journals) {
            const issue = issueMap.get(journal.journalized_id);
            if (!issue) continue;

            const proj = projectMap.get(issue.project_id);
            // Get new status from journal_details if status changed
            const newStatusIdStr = statusChangeMap.get(journal.id);
            const statusId = newStatusIdStr ? parseInt(newStatusIdStr) : issue.status_id;

            activities.push({
                id: journal.id,
                type: "issue_status",
                issueId: issue.id,
                subject: issue.subject,
                trackerName: trackerMap.get(issue.tracker_id) || "Unknown",
                statusName: statusMap.get(statusId) || "Unknown",
                author: "",
                authorId: journal.user_id,
                createdAt: journal.created_on,
                projectName: proj?.name || "",
                projectIdentifier: proj?.identifier || "",
                notes: journal.notes,
                hours: null,
                isRoot: false
            });
        }

        // Add issue creation entries (for issues created in the date range)
        for (const issue of issues) {
            if (issue.created_on && issue.created_on >= startDate) {
                const proj = projectMap.get(issue.project_id);
                activities.push({
                    id: issue.id + 2000000, // offset to avoid collision
                    type: "issue_created",
                    issueId: issue.id,
                    subject: issue.subject,
                    trackerName: trackerMap.get(issue.tracker_id) || "Unknown",
                    statusName: statusMap.get(issue.status_id) || "Unknown", // current status
                    author: "",
                    authorId: issue.author_id,
                    createdAt: issue.created_on,
                    projectName: proj?.name || "",
                    projectIdentifier: proj?.identifier || "",
                    notes: null,
                    hours: null,
                    isRoot: false
                });
            }
        }
    }

    if (filters.includes("time_entries")) {
        // Get issues first if not already in issues filter
        let issueMap: Map<number, { id: number; subject: string; tracker_id: number; status_id: number }>;
        if (!filters.includes("issues")) {
            const issues = await prisma.issues.findMany({
                where: { project_id: { in: projectIds } },
                select: { id: true, subject: true, tracker_id: true, status_id: true }
            });
            issueMap = new Map(issues.map(i => [i.id, i]));
        } else {
            const issues = await prisma.issues.findMany({
                where: { project_id: { in: projectIds } },
                select: { id: true, subject: true, tracker_id: true, status_id: true }
            });
            issueMap = new Map(issues.map(i => [i.id, i]));
        }

        const timeEntries = await prisma.time_entries.findMany({
            where: {
                project_id: { in: projectIds },
                created_on: { gte: startDate }
            },
            select: {
                id: true,
                comments: true,
                hours: true,
                project_id: true,
                user_id: true,
                issue_id: true,
                created_on: true,
            },
            orderBy: { created_on: "desc" },
            take: 200
        });

        timeEntries.forEach(t => allUserIds.add(t.user_id));

        for (const entry of timeEntries) {
            const issue = entry.issue_id ? issueMap.get(entry.issue_id) : null;
            const proj = projectMap.get(entry.project_id);

            activities.push({
                id: entry.id + 1000000,
                type: "time_entry",
                issueId: entry.issue_id || 0,
                subject: issue?.subject || proj?.name || "",
                trackerName: issue ? (trackerMap.get(issue.tracker_id) || "") : "",
                statusName: issue ? (statusMap.get(issue.status_id) || "") : "",
                author: "",
                authorId: entry.user_id,
                createdAt: entry.created_on,
                projectName: proj?.name || "",
                projectIdentifier: proj?.identifier || "",
                notes: entry.comments,
                hours: Number(entry.hours),
                isRoot: false
            });
        }
    }

    // Add wiki_edits filter
    if (filters.includes("wiki_edits")) {
        // Get wiki for this project
        const wikis = await prisma.wikis.findMany({
            where: { project_id: { in: projectIds } },
            select: { id: true, project_id: true }
        });
        const wikiIds = wikis.map(w => w.id);
        const wikiProjectMap = new Map(wikis.map(w => [w.id, w.project_id]));

        if (wikiIds.length > 0) {
            // Get wiki pages
            const wikiPages = await prisma.wiki_pages.findMany({
                where: { wiki_id: { in: wikiIds } },
                select: { id: true, wiki_id: true, title: true }
            });
            const pageIds = wikiPages.map(p => p.id);
            const pageMap = new Map(wikiPages.map(p => [p.id, p]));

            // Get wiki content versions
            const wikiVersions = await prisma.wiki_content_versions.findMany({
                where: {
                    page_id: { in: pageIds },
                    updated_on: { gte: startDate }
                },
                select: {
                    id: true,
                    page_id: true,
                    author_id: true,
                    comments: true,
                    updated_on: true,
                    version: true
                },
                orderBy: { updated_on: "desc" },
                take: 200
            });

            wikiVersions.forEach(v => {
                if (v.author_id) allUserIds.add(v.author_id);
            });

            for (const version of wikiVersions) {
                const page = pageMap.get(version.page_id);
                if (!page) continue;

                const wikiProjectId = wikiProjectMap.get(page.wiki_id);
                const proj = wikiProjectId ? projectMap.get(wikiProjectId) : null;

                activities.push({
                    id: version.id + 3000000, // offset to avoid collision
                    type: "wiki_edit",
                    issueId: 0, // wiki edits don't have issueId
                    subject: page.title,
                    trackerName: "",
                    statusName: `#${version.version}`,
                    author: "",
                    authorId: version.author_id || 0,
                    createdAt: version.updated_on,
                    projectName: proj?.name || "",
                    projectIdentifier: proj?.identifier || "",
                    notes: version.comments,
                    hours: null,
                    isRoot: true // Each wiki edit is a root entry
                });
            }
        }
    }

    // Get users
    const users = await prisma.users.findMany({
        where: { id: { in: [...allUserIds] } },
        select: { id: true, firstname: true, lastname: true, login: true }
    });
    const userMap = new Map(users.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim() || u.login]));

    // Fill in author names
    activities.forEach(a => {
        a.author = userMap.get(a.authorId) || "Unknown";
    });

    // Sort by date desc
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Group by issue and mark root entries
    const seenIssues = new Set<number>();
    for (const activity of activities) {
        if (activity.issueId > 0 && !seenIssues.has(activity.issueId)) {
            activity.isRoot = true;
            seenIssues.add(activity.issueId);
        }
    }

    return activities;
}

export default async function ProjectActivityPage({ params, searchParams }: Props) {
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

    const defaultFilters = ["issues", "time_entries"];
    const filters = query.show
        ? (Array.isArray(query.show) ? query.show : [query.show])
        : defaultFilters;
    const includeSubprojects = query.subprojects === "1";

    const activities = await getActivities(project.id, filters, includeSubprojects);

    const enabledModules = await prisma.enabled_modules.findMany({
        where: { project_id: project.id },
        select: { name: true }
    });

    return (
        <ActivityList
            project={project}
            activities={activities}
            filters={filters}
            includeSubprojects={includeSubprojects}
            modules={enabledModules.map(m => m.name)}
        />
    );
}
