"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Activity {
    id: number;
    type: "issue_created" | "issue_status" | "time_entry" | "wiki_edit";
    issueId: number;
    subject: string;
    trackerName: string;
    statusName: string;
    author: string;
    authorId: number;
    createdAt: Date;
    projectName: string;
    projectIdentifier: string;
    notes: string | null;
    hours: number | null;
    isRoot: boolean;
}

interface Project {
    id: number;
    name: string;
    identifier: string | null;
}

interface ActivityListProps {
    project: Project;
    activities: Activity[];
    filters: string[];
    includeSubprojects: boolean;
    modules: string[];
}

// Module tabs
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

const FILTER_OPTIONS = [
    { id: "issues", name: "Issues" },
    { id: "changesets", name: "Changesets" },
    { id: "news", name: "News" },
    { id: "documents", name: "Documents" },
    { id: "files", name: "Files" },
    { id: "wiki_edits", name: "Wiki edits" },
    { id: "time_entries", name: "Spent time" },
];

// Group by date, then by issue within each date
function groupByDateAndIssue(activities: Activity[]): Record<string, { issueId: number; activities: Activity[] }[]> {
    const dateGroups: Record<string, Activity[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First, group by date
    for (const activity of activities) {
        const date = new Date(activity.createdAt);
        date.setHours(0, 0, 0, 0);

        let key: string;
        if (date.getTime() === today.getTime()) {
            key = "Today";
        } else {
            key = date.toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric"
            });
        }

        if (!dateGroups[key]) {
            dateGroups[key] = [];
        }
        dateGroups[key].push(activity);
    }

    // Then, for each date, group by issueId maintaining order of first appearance
    const result: Record<string, { issueId: number; activities: Activity[] }[]> = {};

    for (const [date, items] of Object.entries(dateGroups)) {
        const issueGroups: Map<number, Activity[]> = new Map();
        const issueOrder: number[] = [];

        for (const activity of items) {
            const key = activity.issueId || 0;
            if (!issueGroups.has(key)) {
                issueGroups.set(key, []);
                issueOrder.push(key);
            }
            issueGroups.get(key)!.push(activity);
        }

        result[date] = issueOrder.map(issueId => ({
            issueId,
            activities: issueGroups.get(issueId)!
        }));
    }

    return result;
}

function formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function getIcon(type: string, trackerName: string): string {
    if (type === "time_entry") return "⏱️";
    if (type === "wiki_edit") return "📝";
    const name = trackerName.toLowerCase();
    if (name.includes("bug")) return "🔧";
    if (name.includes("feature")) return "⚙️";
    if (name.includes("support")) return "💬";
    return "📋";
}

export function ActivityList({
    project,
    activities,
    filters,
    includeSubprojects,
    modules
}: ActivityListProps) {
    const router = useRouter();
    const projectUrl = `/projects/${project.identifier || project.id}`;

    const [selectedFilters, setSelectedFilters] = useState<string[]>(filters);
    const [showSubprojects, setShowSubprojects] = useState(includeSubprojects);

    const visibleTabs = MODULE_TABS.filter(tab => {
        if (tab.module === null) return true;
        return modules.includes(tab.module);
    });

    const groupedActivities = groupByDateAndIssue(activities);

    const handleApplyFilters = () => {
        const params = new URLSearchParams();
        selectedFilters.forEach(f => params.append("show", f));
        if (showSubprojects) params.set("subprojects", "1");
        router.push(`${projectUrl}/activity?${params.toString()}`);
    };

    const toggleFilter = (filterId: string) => {
        setSelectedFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(f => f !== filterId)
                : [...prev, filterId]
        );
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return (
        <div className="space-y-4">
            {/* Project Header */}
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t">
                <div className="text-xs opacity-80">
                    {project.identifier && <span>{project.identifier} »</span>}
                </div>
                <h1 className="text-xl font-semibold">{project.name}</h1>
            </div>

            {/* Tabs Bar */}
            <div className="flex items-center gap-1 border-b overflow-x-auto">
                {visibleTabs.map(tab => (
                    <Link
                        key={tab.id}
                        href={`${projectUrl}${tab.href}`}
                        className={`px-3 py-2 text-sm whitespace-nowrap ${tab.id === "activity"
                            ? "font-medium bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-primary"
                            }`}
                    >
                        {tab.name}
                    </Link>
                ))}
            </div>

            {/* Activity Header */}
            <div>
                <h2 className="text-lg font-semibold">Activity</h2>
                <p className="text-sm text-muted-foreground">
                    From {startDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} to {new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                </p>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Activities List */}
                <div className="lg:col-span-3 space-y-6">
                    {Object.entries(groupedActivities).length === 0 ? (
                        <p className="text-muted-foreground">No activity found.</p>
                    ) : (
                        Object.entries(groupedActivities).map(([date, issueGroups]) => (
                            <div key={date}>
                                <h3 className="font-semibold mb-3">{date}</h3>
                                <div className="space-y-2">
                                    {issueGroups.map((group, groupIdx) => {
                                        const [rootEntry, ...subEntries] = group.activities;

                                        return (
                                            <div key={`group-${group.issueId}-${groupIdx}`} className="space-y-0">
                                                {/* Root entry - main issue entry */}
                                                <div className="flex gap-2 text-sm py-1">
                                                    <span className="flex-shrink-0 text-yellow-600">
                                                        {getIcon(rootEntry.type, rootEntry.trackerName)}
                                                    </span>
                                                    <span className="text-muted-foreground w-16 flex-shrink-0">
                                                        {formatTime(rootEntry.createdAt)}
                                                    </span>
                                                    <div className="flex-1">
                                                        <div>
                                                            {rootEntry.type === "time_entry" ? (
                                                                <>
                                                                    <span className="text-primary font-medium">
                                                                        {rootEntry.hours} hour{rootEntry.hours !== 1 ? 's' : ''}
                                                                    </span>
                                                                    {rootEntry.issueId > 0 && (
                                                                        <>
                                                                            {" ("}
                                                                            <span className="text-primary">{rootEntry.trackerName}</span>
                                                                            {" "}
                                                                            <Link href={`/issues/${rootEntry.issueId}`} className="text-primary hover:underline">
                                                                                #{rootEntry.issueId}
                                                                            </Link>
                                                                            {rootEntry.statusName && <span> ({rootEntry.statusName})</span>}
                                                                            {": "}<span>{rootEntry.subject}</span>{")"}
                                                                        </>
                                                                    )}
                                                                </>
                                                            ) : rootEntry.type === "wiki_edit" ? (
                                                                <>
                                                                    <span className="font-medium">Wiki edit:</span>{" "}
                                                                    <Link
                                                                        href={`/projects/${rootEntry.projectIdentifier}/wiki/${encodeURIComponent(rootEntry.subject)}`}
                                                                        className="text-primary hover:underline"
                                                                    >
                                                                        {rootEntry.subject}
                                                                    </Link>
                                                                    {rootEntry.statusName && (
                                                                        <span className="text-muted-foreground"> ({rootEntry.statusName})</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="font-medium text-primary">{rootEntry.trackerName}</span>{" "}
                                                                    <Link href={`/issues/${rootEntry.issueId}`} className="text-primary hover:underline">#{rootEntry.issueId}</Link>
                                                                    {rootEntry.statusName && <span className="text-muted-foreground"> ({rootEntry.statusName})</span>}
                                                                    {": "}<span className="text-primary hover:underline">{rootEntry.subject}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {rootEntry.notes && <div className="text-muted-foreground mt-1 text-xs italic line-clamp-2">{rootEntry.notes}</div>}
                                                        <div className="text-muted-foreground">
                                                            <Link href={`/users/${rootEntry.authorId}`} className="text-primary hover:underline">{rootEntry.author}</Link>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Sub entries - indented under root */}
                                                {subEntries.map((activity, idx) => (
                                                    <div key={`${activity.type}-${activity.id}-${idx}`} className="flex gap-2 text-sm py-1 ml-8 border-l-2 border-blue-300 pl-3">
                                                        <span className="flex-shrink-0 text-yellow-600">
                                                            {getIcon(activity.type, activity.trackerName)}
                                                        </span>
                                                        <span className="text-muted-foreground w-16 flex-shrink-0">
                                                            {formatTime(activity.createdAt)}
                                                        </span>
                                                        <div className="flex-1">
                                                            <div>
                                                                {activity.type === "time_entry" ? (
                                                                    <>
                                                                        <span className="text-primary font-medium">
                                                                            {activity.hours} hour{activity.hours !== 1 ? 's' : ''}
                                                                        </span>
                                                                        {activity.issueId > 0 && (
                                                                            <>
                                                                                {" ("}
                                                                                <span className="text-primary">{activity.trackerName}</span>{" "}
                                                                                <Link href={`/issues/${activity.issueId}`} className="text-primary hover:underline">#{activity.issueId}</Link>
                                                                                {activity.statusName && <span> ({activity.statusName})</span>}
                                                                                {": "}<span>{activity.subject}</span>{")"}
                                                                            </>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-medium text-primary">{activity.trackerName}</span>{" "}
                                                                        <Link href={`/issues/${activity.issueId}`} className="text-primary hover:underline">#{activity.issueId}</Link>
                                                                        {activity.statusName && <span className="text-muted-foreground"> ({activity.statusName})</span>}
                                                                        {": "}<span className="text-primary hover:underline">{activity.subject}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {activity.notes && <div className="text-muted-foreground mt-1 text-xs italic line-clamp-2">{activity.notes}</div>}
                                                            <div className="text-muted-foreground">
                                                                <Link href={`/users/${activity.authorId}`} className="text-primary hover:underline">{activity.author}</Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Filter Sidebar */}
                <div className="lg:col-span-1">
                    <div className="border rounded p-4 bg-muted/30">
                        <h3 className="font-semibold mb-3">Activity</h3>
                        <div className="space-y-2">
                            {FILTER_OPTIONS.map(option => (
                                <label key={option.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedFilters.includes(option.id)}
                                        onChange={() => toggleFilter(option.id)}
                                        className="h-4 w-4 rounded border-input"
                                    />
                                    {option.name}
                                </label>
                            ))}
                        </div>

                        <div className="border-t mt-4 pt-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={showSubprojects}
                                    onChange={(e) => setShowSubprojects(e.target.checked)}
                                    className="h-4 w-4 rounded border-input"
                                />
                                Subprojects
                            </label>
                        </div>

                        <Button
                            onClick={handleApplyFilters}
                            className="mt-4 w-full"
                            size="sm"
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
