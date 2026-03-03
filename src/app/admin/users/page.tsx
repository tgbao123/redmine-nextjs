import { prisma } from "@/lib/db/prisma";
import { UserList } from "./user-list";

export default async function AdminUsersPage() {
    const users = await prisma.users.findMany({
        where: { type: "User" },
        orderBy: { login: "asc" },
        select: { id: true, login: true, firstname: true, lastname: true, admin: true, status: true, last_login_on: true, created_on: true },
    });

    // Get emails from email_addresses table
    const userIds = users.map(u => u.id);
    const emails = await prisma.email_addresses.findMany({
        where: { user_id: { in: userIds }, is_default: true },
        select: { user_id: true, address: true },
    });
    const emailMap = Object.fromEntries(emails.map(e => [e.user_id, e.address]));

    const usersWithEmail = users.map(u => ({ ...u, mail: emailMap[u.id] || null }));

    return <UserList users={usersWithEmail} />;
}
