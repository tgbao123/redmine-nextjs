import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProjectList } from "./project-list";

// Project status enum from Redmine
const PROJECT_STATUS = {
    ACTIVE: 1,
    CLOSED: 5,
    ARCHIVED: 9,
} as const;

async function getProjects(userId: number | null) {
    // Get member project IDs for user
    let memberProjectIds: number[] = [];
    if (userId) {
        const memberships = await prisma.members.findMany({
            where: { user_id: userId },
            select: { project_id: true }
        });
        memberProjectIds = memberships.map((m: { project_id: number }) => m.project_id);
    }

    // Get all active and closed projects (public or user is member)
    // Exclude archived (status = 9)
    const projects = await prisma.projects.findMany({
        where: {
            status: { in: [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.CLOSED] },
            OR: [
                { is_public: true },
                ...(memberProjectIds.length > 0
                    ? [{ id: { in: memberProjectIds } }]
                    : [])
            ]
        },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            identifier: true,
            description: true,
            is_public: true,
            parent_id: true,
            created_on: true,
            status: true,
        }
    });

    return projects;
}

export default async function ProjectsPage() {
    const user = await getSession();

    if (!user) {
        redirect("/login");
    }

    const projects = await getProjects(user.id);

    return <ProjectList projects={projects} isAdmin={user.admin} />;
}
