import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { ProjectOverview } from "./project-overview";

interface Props {
    params: Promise<{ identifier: string }>;
}

async function getProject(identifier: string, userId: number, isAdmin: boolean) {
    // Try to find by identifier first, then by id
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
            description: true,
            homepage: true,
            is_public: true,
            parent_id: true,
            created_on: true,
            updated_on: true,
            status: true,
        }
    });

    if (!project) return null;

    // Check access: admin, public, or member
    if (!isAdmin && !project.is_public) {
        const membership = await prisma.members.findFirst({
            where: {
                project_id: project.id,
                user_id: userId
            }
        });
        if (!membership) return null;
    }

    // Get issue counts by tracker with open/closed status
    const issueStats = await prisma.$queryRaw<Array<{
        tracker_id: number;
        tracker_name: string;
        open_count: bigint;
        closed_count: bigint;
    }>>`
        SELECT 
            t.id as tracker_id,
            t.name as tracker_name,
            SUM(CASE WHEN ist.is_closed = 0 THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN ist.is_closed = 1 THEN 1 ELSE 0 END) as closed_count
        FROM issues i
        JOIN trackers t ON i.tracker_id = t.id
        JOIN issue_statuses ist ON i.status_id = ist.id
        WHERE i.project_id = ${project.id}
        GROUP BY t.id, t.name
        ORDER BY t.position
    `;

    const issuesByTracker = issueStats.map(stat => ({
        trackerId: stat.tracker_id,
        tracker: stat.tracker_name,
        open: Number(stat.open_count),
        closed: Number(stat.closed_count),
        total: Number(stat.open_count) + Number(stat.closed_count)
    }));

    // Get total spent time
    const spentTimeResult = await prisma.time_entries.aggregate({
        where: { project_id: project.id },
        _sum: { hours: true }
    });
    const spentTime = spentTimeResult._sum.hours || 0;

    // Get members grouped by role
    const membersWithRoles = await prisma.$queryRaw<Array<{
        user_id: number;
        firstname: string;
        lastname: string;
        login: string;
        role_id: number;
        role_name: string;
    }>>`
        SELECT 
            u.id as user_id,
            u.firstname,
            u.lastname,
            u.login,
            r.id as role_id,
            r.name as role_name
        FROM members m
        JOIN users u ON m.user_id = u.id
        JOIN member_roles mr ON m.id = mr.member_id
        JOIN roles r ON mr.role_id = r.id
        WHERE m.project_id = ${project.id}
        ORDER BY r.position, u.firstname
    `;

    // Group members by role
    const membersByRole: Record<string, Array<{ id: number; name: string; login: string }>> = {};
    for (const m of membersWithRoles) {
        if (!membersByRole[m.role_name]) {
            membersByRole[m.role_name] = [];
        }
        // Avoid duplicates
        if (!membersByRole[m.role_name].find(u => u.id === m.user_id)) {
            membersByRole[m.role_name].push({
                id: m.user_id,
                name: `${m.firstname} ${m.lastname}`.trim() || m.login,
                login: m.login
            });
        }
    }

    // Get member count
    const memberCount = await prisma.members.count({
        where: { project_id: project.id }
    });

    // Get subprojects
    const subprojects = await prisma.projects.findMany({
        where: { parent_id: project.id, status: 1 },
        select: { id: true, name: true, identifier: true }
    });

    // Get enabled modules
    const enabledModules = await prisma.enabled_modules.findMany({
        where: { project_id: project.id },
        select: { name: true }
    });
    const modules = enabledModules.map(m => m.name);

    return {
        ...project,
        issuesByTracker,
        spentTime: Number(spentTime),
        membersByRole,
        memberCount,
        subprojects,
        modules
    };
}

export default async function ProjectDetailPage({ params }: Props) {
    const user = await getSession();

    if (!user) {
        redirect("/login");
    }

    const { identifier } = await params;
    const project = await getProject(identifier, user.id, user.admin);

    if (!project) {
        notFound();
    }

    return <ProjectOverview project={project} isAdmin={user.admin} />;
}
