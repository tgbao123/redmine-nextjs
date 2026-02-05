"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";

interface IssueByTracker {
    trackerId: number;
    tracker: string;
    open: number;
    closed: number;
    total: number;
}

interface Project {
    id: number;
    name: string;
    identifier: string | null;
    description: string | null;
    homepage: string | null;
    is_public: boolean;
    created_on: Date | null;
    issuesByTracker: IssueByTracker[];
    spentTime: number;
    membersByRole: Record<string, Array<{ id: number; name: string; login: string }>>;
    memberCount: number;
    subprojects: { id: number; name: string; identifier: string | null }[];
    modules: string[];
}

interface ProjectOverviewProps {
    project: Project;
    isAdmin: boolean;
}

// Module tabs mapping
const MODULE_TABS = [
    { id: "overview", name: "Overview", href: "", module: null },
    { id: "activity", name: "Activity", href: "/activity", module: null },
    { id: "roadmap", name: "Roadmap", href: "/roadmap", module: null },
    { id: "issue_tracking", name: "Issues", href: "/issues", module: "issue_tracking" },
    { id: "time_tracking", name: "Spent time", href: "/time_entries", module: "time_tracking" },
    { id: "gantt", name: "Gantt", href: "/gantt", module: "gantt" },
    { id: "agile", name: "Agile", href: "/agile", module: "agile" },
    { id: "calendar", name: "Calendar", href: "/calendar", module: "calendar" },
    { id: "documents", name: "Documents", href: "/documents", module: "documents" },
    { id: "wiki", name: "Wiki", href: "/wiki", module: "wiki" },
    { id: "files", name: "Files", href: "/files", module: "files" },
    { id: "settings", name: "Settings", href: "/settings", module: null },
];

export function ProjectOverview({ project, isAdmin }: ProjectOverviewProps) {
    const { t } = useI18n();
    const projectUrl = `/projects/${project.identifier || project.id}`;

    // Filter tabs based on enabled modules
    const visibleTabs = MODULE_TABS.filter(tab => {
        if (tab.module === null) return true; // Always show non-module tabs
        return project.modules.includes(tab.module);
    });

    // Calculate totals
    const totalOpen = project.issuesByTracker.reduce((sum, i) => sum + i.open, 0);
    const totalClosed = project.issuesByTracker.reduce((sum, i) => sum + i.closed, 0);
    const totalIssues = totalOpen + totalClosed;

    return (
        <div className="space-y-4">
            {/* Project Header */}
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t">
                <div className="text-xs opacity-80">
                    {project.identifier && (
                        <span>{project.identifier} »</span>
                    )}
                </div>
                <h1 className="text-xl font-semibold">{project.name}</h1>
            </div>

            {/* Tabs Bar */}
            <div className="flex items-center gap-1 border-b overflow-x-auto">
                {visibleTabs.map((tab, index) => (
                    <Link
                        key={tab.id}
                        href={`${projectUrl}${tab.href}`}
                        className={`px-3 py-2 text-sm whitespace-nowrap ${index === 0
                            ? "font-medium bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-primary"
                            }`}
                    >
                        {tab.name}
                    </Link>
                ))}

                {/* Right side actions */}
                <div className="ml-auto flex items-center gap-2 text-sm">
                    <Link href={`${projectUrl}/new`} className="text-primary hover:underline">
                        + New subproject
                    </Link>
                    <span className="text-muted-foreground">|</span>
                    <Link href="#" className="text-primary hover:underline">
                        Close
                    </Link>
                </div>
            </div>

            {/* Overview Title */}
            <h2 className="text-lg font-semibold">Overview</h2>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Issue Tracking */}
                    {project.modules.includes("issue_tracking") && (
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="text-primary">▸</span> Issue tracking
                            </h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-1"></th>
                                        <th className="text-right py-1 px-2">open</th>
                                        <th className="text-right py-1 px-2">closed</th>
                                        <th className="text-right py-1 px-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {project.issuesByTracker.map(stat => (
                                        <tr key={stat.trackerId} className="border-b">
                                            <td className="py-1">
                                                <Link
                                                    href={`${projectUrl}/issues?tracker_id=${stat.trackerId}`}
                                                    className="text-primary hover:underline"
                                                >
                                                    {stat.tracker}
                                                </Link>
                                            </td>
                                            <td className="text-right py-1 px-2">{stat.open}</td>
                                            <td className="text-right py-1 px-2">{stat.closed}</td>
                                            <td className="text-right py-1 px-2">{stat.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-2 text-sm text-muted-foreground">
                                <Link href={`${projectUrl}/issues`} className="text-primary hover:underline">
                                    View all issues
                                </Link>
                                {" | "}
                                <Link href={`${projectUrl}/calendar`} className="text-primary hover:underline">
                                    Calendar
                                </Link>
                                {" | "}
                                <Link href={`${projectUrl}/gantt`} className="text-primary hover:underline">
                                    Gantt
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Spent Time */}
                    {project.modules.includes("time_tracking") && project.spentTime > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="text-primary">▸</span> Spent time
                            </h3>
                            <p className="text-sm">{project.spentTime.toFixed(2)} hours</p>
                            <div className="mt-2 text-sm text-muted-foreground">
                                <Link href={`${projectUrl}/time_entries/new`} className="text-primary hover:underline">
                                    Log time
                                </Link>
                                {" | "}
                                <Link href={`${projectUrl}/time_entries`} className="text-primary hover:underline">
                                    Details
                                </Link>
                                {" | "}
                                <Link href={`${projectUrl}/time_entries/report`} className="text-primary hover:underline">
                                    Report
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Members */}
                <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <span className="text-primary">▸</span> Members
                    </h3>
                    <div className="space-y-2 text-sm">
                        {Object.entries(project.membersByRole).map(([role, members]) => (
                            <div key={role}>
                                <span className="font-medium">{role}:</span>{" "}
                                <span className="text-muted-foreground">
                                    {members.map((m, idx) => (
                                        <span key={m.id}>
                                            <Link
                                                href={`/users/${m.id}`}
                                                className="text-primary hover:underline"
                                            >
                                                {m.name}
                                            </Link>
                                            {idx < members.length - 1 && ", "}
                                        </span>
                                    ))}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Subprojects */}
            {project.subprojects.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <span className="text-primary">▸</span> Subprojects
                    </h3>
                    <div className="flex flex-wrap gap-2 text-sm">
                        {project.subprojects.map((sub, idx) => (
                            <span key={sub.id}>
                                <Link
                                    href={`/projects/${sub.identifier || sub.id}`}
                                    className="text-primary hover:underline"
                                >
                                    {sub.name}
                                </Link>
                                {idx < project.subprojects.length - 1 && ", "}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
