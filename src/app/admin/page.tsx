import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
    const [userCount, projectCount, issueCount, roleCount] = await Promise.all([
        prisma.users.count({ where: { type: "User", status: 1 } }),
        prisma.projects.count({ where: { status: 1 } }),
        prisma.issues.count(),
        prisma.roles.count({ where: { builtin: 0 } }),
    ]);

    const stats = [
        { label: "Active Users", value: userCount, href: "/admin/users", color: "bg-blue-500" },
        { label: "Active Projects", value: projectCount, href: "/admin", color: "bg-green-500" },
        { label: "Total Issues", value: issueCount, href: "/admin", color: "bg-purple-500" },
        { label: "Custom Roles", value: roleCount, href: "/admin/roles", color: "bg-orange-500" },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Administration</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <Link key={s.label} href={s.href} className="border rounded-lg p-4 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center text-white text-lg font-bold mb-2`}>
                            {s.value}
                        </div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.label}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
