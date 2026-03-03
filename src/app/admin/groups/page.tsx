import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GroupEditor } from "./group-editor";

export default async function AdminGroupsPage() {
    const user = await getSession();
    if (!user?.admin) redirect("/login");

    const groups = await prisma.users.findMany({
        where: { type: "Group" },
        orderBy: { lastname: "asc" },
        select: { id: true, lastname: true, status: true, created_on: true },
    });

    // Get member counts
    const groupIds = groups.map(g => g.id);
    const memberCounts = groupIds.length > 0
        ? await prisma.groups_users.groupBy({
            by: ["group_id"],
            _count: { user_id: true },
            where: { group_id: { in: groupIds } },
        })
        : [];
    const countMap = Object.fromEntries(memberCounts.map(c => [c.group_id, c._count.user_id]));

    // Get all active users for adding to groups
    const allUsers = await prisma.users.findMany({
        where: { type: "User", status: 1 },
        orderBy: { login: "asc" },
        select: { id: true, login: true, firstname: true, lastname: true },
    });

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">Groups</h1>
            </div>
            <div className="px-6 py-4">
                <GroupEditor
                    groups={groups.map(g => ({ id: g.id, name: g.lastname, memberCount: countMap[g.id] || 0, createdOn: g.created_on?.toISOString() || "" }))}
                    allUsers={allUsers.map(u => ({ id: u.id, name: `${u.firstname} ${u.lastname}`.trim() || u.login || "" }))}
                />
            </div>
        </div>
    );
}
