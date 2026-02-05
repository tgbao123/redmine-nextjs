import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { RoadmapList } from "./roadmap-list";

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

async function getVersionsWithIssues(projectId: number, trackerFilters: string[], showCompleted: boolean) {
    // Get all trackers
    const trackers = await prisma.trackers.findMany({
        select: { id: true, name: true }
    });
    const trackerMap = new Map(trackers.map(t => [t.id, t.name]));

    // Get all statuses
    const statuses = await prisma.issue_statuses.findMany({
        select: { id: true, name: true, is_closed: true }
    });
    const statusMap = new Map(statuses.map(s => [s.id, { name: s.name, isClosed: s.is_closed }]));

    // Get versions for this project
    const versionsQuery = await prisma.versions.findMany({
        where: {
            project_id: projectId,
            ...(showCompleted ? {} : { status: { not: "closed" } })
        },
        orderBy: [
            { effective_date: "asc" },
            { name: "asc" }
        ]
    });

    // Get all issues for these versions
    const versionIds = versionsQuery.map(v => v.id);
    const issues = await prisma.issues.findMany({
        where: {
            fixed_version_id: { in: versionIds }
        },
        select: {
            id: true,
            subject: true,
            tracker_id: true,
            status_id: true,
            fixed_version_id: true
        }
    });

    // Group issues by version
    const issuesByVersion = new Map<number, typeof issues>();
    for (const issue of issues) {
        if (issue.fixed_version_id) {
            if (!issuesByVersion.has(issue.fixed_version_id)) {
                issuesByVersion.set(issue.fixed_version_id, []);
            }
            issuesByVersion.get(issue.fixed_version_id)!.push(issue);
        }
    }

    // Build version objects with issues
    const versions = versionsQuery.map(version => {
        const versionIssues = issuesByVersion.get(version.id) || [];

        // Apply tracker filter if specified
        let filteredIssues = versionIssues;
        if (trackerFilters.length > 0) {
            const trackerFilterSet = new Set(trackerFilters.map(f => f.toLowerCase()));
            filteredIssues = versionIssues.filter(issue => {
                const trackerName = trackerMap.get(issue.tracker_id)?.toLowerCase() || "";
                return trackerFilterSet.has(trackerName);
            });
        }

        const openCount = versionIssues.filter(i => !statusMap.get(i.status_id)?.isClosed).length;
        const closedCount = versionIssues.filter(i => statusMap.get(i.status_id)?.isClosed).length;

        return {
            id: version.id,
            name: version.name,
            description: version.description,
            effectiveDate: version.effective_date,
            status: version.status || "open",
            issues: filteredIssues.map(issue => ({
                id: issue.id,
                subject: issue.subject,
                trackerName: trackerMap.get(issue.tracker_id) || "Unknown",
                statusName: statusMap.get(issue.status_id)?.name || "Unknown",
                isClosed: statusMap.get(issue.status_id)?.isClosed || false
            })),
            openCount,
            closedCount
        };
    });

    return { versions, trackers };
}

export default async function ProjectRoadmapPage({ params, searchParams }: Props) {
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
    const trackerFilters = query.tracker
        ? (Array.isArray(query.tracker) ? query.tracker : [query.tracker])
        : [];
    const showCompleted = query.completed === "1";

    const { versions, trackers } = await getVersionsWithIssues(project.id, trackerFilters, showCompleted);

    const enabledModules = await prisma.enabled_modules.findMany({
        where: { project_id: project.id },
        select: { name: true }
    });

    return (
        <RoadmapList
            project={project}
            versions={versions}
            trackers={trackers}
            filters={trackerFilters}
            showCompleted={showCompleted}
            modules={enabledModules.map(m => m.name)}
        />
    );
}
