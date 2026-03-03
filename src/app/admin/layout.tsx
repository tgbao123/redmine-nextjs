import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_MENU = [
    { label: "Users", href: "/admin/users", icon: "👤" },
    { label: "Roles & Permissions", href: "/admin/roles", icon: "🔐" },
    { label: "Trackers", href: "/admin/trackers", icon: "📋" },
    { label: "Issue Statuses", href: "/admin/issue-statuses", icon: "📊" },
    { label: "Workflows", href: "/admin/workflows", icon: "🔄" },
    { label: "Custom Fields", href: "/admin/custom-fields", icon: "🏷️" },
    { label: "Enumerations", href: "/admin/enumerations", icon: "📝" },
    { label: "Settings", href: "/admin/settings", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getSession();
    if (!user) redirect("/login");
    if (!user.admin) redirect("/");

    return (
        <div className="min-h-screen flex">
            {/* Admin Sidebar */}
            <aside className="w-56 bg-gray-900 text-gray-300 flex-shrink-0">
                <div className="p-4 border-b border-gray-700">
                    <Link href="/admin" className="text-lg font-bold text-white hover:text-blue-400">Administration</Link>
                </div>
                <nav className="p-2 space-y-0.5">
                    {ADMIN_MENU.map((item) => (
                        <Link key={item.href} href={item.href}
                            className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-gray-800 hover:text-white transition-colors">
                            <span>{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-700 mt-auto">
                    <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">← Back to app</Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-gray-50 dark:bg-gray-950">
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
