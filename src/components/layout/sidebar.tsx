"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    User,
    FolderKanban,
    Settings,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/auth/actions";
import { useI18n } from "@/components/providers/i18n-provider";

interface SidebarProps {
    user?: {
        firstname: string;
        lastname: string;
        login: string;
        admin: boolean;
    } | null;
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const { t } = useI18n();

    const navigation = [
        { name: t.nav.home, href: "/", icon: Home },
        { name: t.nav.myPage, href: "/my/page", icon: User },
        { name: t.nav.projects, href: "/projects", icon: FolderKanban },
    ];

    const displayName = user
        ? `${user.firstname} ${user.lastname}`.trim() || user.login
        : "Guest";
    const initials = user
        ? (user.firstname?.[0] || "") + (user.lastname?.[0] || "") || user.login[0]
        : "G";

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar">
            <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center border-b px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            R
                        </div>
                        <span className="text-lg font-semibold">Redmine</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                    <div className="space-y-1">
                        {navigation.map((item) => {
                            const isActive =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Admin Section - Only show for admins */}
                    {user?.admin && (
                        <div className="pt-6">
                            <Link
                                href="/admin"
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    pathname.startsWith("/admin")
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <Settings className="h-5 w-5" />
                                {t.nav.administration}
                            </Link>
                        </div>
                    )}
                </nav>

                {/* User Section */}
                <div className="border-t p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium uppercase">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">{displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {user?.login || t.auth.notLoggedIn}
                            </p>
                        </div>
                        {user && (
                            <Link
                                href="/my/account"
                                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                title={t.account.title}
                            >
                                <User className="h-4 w-4" />
                            </Link>
                        )}
                        <form action={logoutAction}>
                            <button
                                type="submit"
                                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                title={t.auth.logout}
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </aside>
    );
}
