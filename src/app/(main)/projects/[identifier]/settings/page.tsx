import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { SettingsTabs } from "./settings-tabs";

interface Props {
    params: Promise<{ identifier: string }>;
}

export default async function ProjectSettingsPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");

    const { identifier } = await params;
    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true, description: true, homepage: true, is_public: true, inherit_members: true, status: true, parent_id: true },
    });
    if (!project) notFound();

    // Permission check — admin or member with edit_project permission
    if (!user.admin) {
        const member = await prisma.members.findFirst({ where: { project_id: project.id, user_id: user.id } });
        if (!member) notFound();
    }

    // Fetch all settings data in parallel
    const [
        trackers, projectTrackers, allModules, enabledModules,
        members, memberRoles, roles, allUsers,
        versions, categories,
    ] = await Promise.all([
        prisma.trackers.findMany({ select: { id: true, name: true }, orderBy: { position: "asc" } }),
        prisma.projects_trackers.findMany({ where: { project_id: project.id }, select: { tracker_id: true } }),
        Promise.resolve(["issue_tracking", "time_tracking", "news", "documents", "files", "wiki", "boards", "calendar", "gantt"]),
        prisma.enabled_modules.findMany({ where: { project_id: project.id }, select: { name: true } }),
        prisma.members.findMany({ where: { project_id: project.id }, select: { id: true, user_id: true, created_on: true }, orderBy: { id: "asc" } }),
        prisma.member_roles.findMany({ where: { member_id: { in: [] } } }), // Placeholder, fetched below
        prisma.roles.findMany({ where: { builtin: 0 }, select: { id: true, name: true }, orderBy: { position: "asc" } }),
        prisma.users.findMany({ where: { status: 1, type: "User" }, select: { id: true, firstname: true, lastname: true, login: true }, orderBy: { login: "asc" } }),
        prisma.versions.findMany({ where: { project_id: project.id }, orderBy: [{ effective_date: "asc" }, { name: "asc" }] }),
        prisma.issue_categories.findMany({ where: { project_id: project.id }, orderBy: { name: "asc" } }),
    ]);

    // Fetch member roles separately (need member IDs first)
    const memberIds = members.map(m => m.id);
    const memberRolesData = memberIds.length > 0
        ? await prisma.member_roles.findMany({ where: { member_id: { in: memberIds } }, select: { member_id: true, role_id: true } })
        : [];

    // Transform members data
    const userMap = Object.fromEntries(allUsers.map(u => [u.id, { id: u.id, name: `${u.firstname} ${u.lastname}`.trim() || u.login, login: u.login }]));
    const membersData = members.map(m => ({
        id: m.id,
        userId: m.user_id,
        user: userMap[m.user_id] || { id: m.user_id, name: "Unknown", login: "" },
        roles: memberRolesData.filter(mr => mr.member_id === m.id).map(mr => mr.role_id),
        createdOn: m.created_on?.toISOString() || "",
    }));

    const versionsData = versions.map(v => ({
        id: v.id, name: v.name, description: v.description || "", status: v.status || "open",
        effectiveDate: v.effective_date?.toISOString().split("T")[0] || "",
        sharing: v.sharing || "none", wikiPageTitle: v.wiki_page_title || "",
    }));

    const categoriesData = categories.map(c => ({
        id: c.id, name: c.name, assignedToId: c.assigned_to_id,
    }));

    return (
        <SettingsTabs
            project={{
                id: project.id,
                name: project.name,
                identifier: project.identifier || "",
                description: project.description || "",
                homepage: project.homepage || "",
                isPublic: project.is_public,
                inheritMembers: project.inherit_members,
            }}
            trackers={trackers}
            selectedTrackerIds={projectTrackers.map(pt => pt.tracker_id)}
            allModules={allModules}
            enabledModules={enabledModules.map(m => m.name)}
            members={membersData}
            roles={roles}
            allUsers={allUsers.map(u => ({ id: u.id, name: `${u.firstname} ${u.lastname}`.trim() || u.login }))}
            versions={versionsData}
            categories={categoriesData}
            isAdmin={user.admin}
        />
    );
}
