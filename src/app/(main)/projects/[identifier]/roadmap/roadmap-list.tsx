"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Issue {
    id: number;
    subject: string;
    trackerName: string;
    statusName: string;
    isClosed: boolean;
}

interface Version {
    id: number;
    name: string;
    description: string | null;
    effectiveDate: Date | null;
    status: string;
    issues: Issue[];
    openCount: number;
    closedCount: number;
}

interface Project {
    id: number;
    name: string;
    identifier: string | null;
}

interface RoadmapListProps {
    project: Project;
    versions: Version[];
    trackers: { id: number; name: string }[];
    filters: string[];
    showCompleted: boolean;
    modules: string[];
}

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

function getTrackerIcon(trackerName: string): string {
    const name = trackerName.toLowerCase();
    if (name.includes("bug")) return "🔧";
    if (name.includes("feature")) return "⚙️";
    if (name.includes("support")) return "💬";
    if (name.includes("task")) return "📋";
    return "📋";
}

function getTrackerColor(trackerName: string): string {
    const name = trackerName.toLowerCase();
    if (name.includes("bug")) return "text-red-600";
    if (name.includes("feature")) return "text-blue-600";
    if (name.includes("support")) return "text-green-600";
    return "text-gray-600";
}

export function RoadmapList({
    project,
    versions,
    trackers,
    filters,
    showCompleted,
    modules
}: RoadmapListProps) {
    const router = useRouter();
    const projectUrl = `/projects/${project.identifier || project.id}`;

    const [selectedFilters, setSelectedFilters] = useState<string[]>(filters);
    const [showCompletedVersions, setShowCompletedVersions] = useState(showCompleted);

    const visibleTabs = MODULE_TABS.filter(tab => {
        if (tab.module === null) return true;
        return modules.includes(tab.module);
    });

    const handleApplyFilters = () => {
        const params = new URLSearchParams();
        selectedFilters.forEach(f => params.append("tracker", f));
        if (showCompletedVersions) params.set("completed", "1");
        router.push(`${projectUrl}/roadmap?${params.toString()}`);
    };

    const toggleFilter = (trackerId: string) => {
        setSelectedFilters(prev =>
            prev.includes(trackerId)
                ? prev.filter(f => f !== trackerId)
                : [...prev, trackerId]
        );
    };

    // Filter versions based on showCompleted
    const displayVersions = showCompletedVersions
        ? versions
        : versions.filter(v => v.status !== "closed");

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
                        className={`px-3 py-2 text-sm whitespace-nowrap ${tab.id === "roadmap"
                            ? "font-medium bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-primary"
                            }`}
                    >
                        {tab.name}
                    </Link>
                ))}
            </div>

            {/* Roadmap Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Roadmap</h2>
                <Link
                    href={`${projectUrl}/versions/new`}
                    className="text-sm text-primary hover:underline"
                >
                    » New version
                </Link>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Versions List */}
                <div className="lg:col-span-3 space-y-6">
                    {displayVersions.length === 0 ? (
                        <p className="text-muted-foreground">No versions defined.</p>
                    ) : (
                        displayVersions.map(version => {
                            const totalIssues = version.openCount + version.closedCount;
                            const progressPercent = totalIssues > 0
                                ? Math.round((version.closedCount / totalIssues) * 100)
                                : 0;

                            // Filter issues by selected trackers
                            const filteredIssues = selectedFilters.length > 0
                                ? version.issues.filter(issue =>
                                    selectedFilters.includes(issue.trackerName.toLowerCase())
                                )
                                : version.issues;

                            return (
                                <div key={version.id} className="border rounded p-4 bg-card">
                                    {/* Version Header */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-green-600">✓</span>
                                        <Link
                                            href={`${projectUrl}/versions/${version.id}`}
                                            className="text-lg font-semibold text-primary hover:underline"
                                        >
                                            {version.name}
                                            {version.effectiveDate && (
                                                <span className="font-normal text-muted-foreground ml-2">
                                                    ({new Date(version.effectiveDate).toLocaleDateString("en-CA")})
                                                </span>
                                            )}
                                        </Link>
                                        {version.status === "closed" && (
                                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">closed</span>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded h-3 overflow-hidden">
                                                <div
                                                    className="bg-green-500 h-full transition-all"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-muted-foreground w-12">
                                                {progressPercent}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Issue Counts */}
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {totalIssues} issues ({version.closedCount} closed - {version.openCount} open)
                                    </p>

                                    {/* Description */}
                                    {version.description && (
                                        <p className="text-sm mb-3">{version.description}</p>
                                    )}

                                    {/* Related Issues */}
                                    {filteredIssues.length > 0 && (
                                        <div>
                                            <h4 className="font-medium text-sm mb-2">Related Issues</h4>
                                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                                {filteredIssues.map(issue => (
                                                    <div
                                                        key={issue.id}
                                                        className={`text-sm flex gap-2 ${issue.isClosed ? 'line-through text-muted-foreground' : ''}`}
                                                    >
                                                        <span className={getTrackerColor(issue.trackerName)}>
                                                            {getTrackerIcon(issue.trackerName)}
                                                        </span>
                                                        <span className={getTrackerColor(issue.trackerName)}>
                                                            {issue.trackerName}
                                                        </span>
                                                        <Link
                                                            href={`/issues/${issue.id}`}
                                                            className="text-primary hover:underline"
                                                        >
                                                            #{issue.id}
                                                        </Link>
                                                        <span>:</span>
                                                        <span className="flex-1 truncate">{issue.subject}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Filter Sidebar */}
                <div className="lg:col-span-1">
                    <div className="border rounded p-4 bg-muted/30">
                        <h3 className="font-semibold mb-3">Roadmap</h3>
                        <div className="space-y-2">
                            {trackers.map(tracker => (
                                <label key={tracker.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedFilters.length === 0 || selectedFilters.includes(tracker.name.toLowerCase())}
                                        onChange={() => toggleFilter(tracker.name.toLowerCase())}
                                        className="h-4 w-4 rounded border-input"
                                    />
                                    <span className={getTrackerColor(tracker.name)}>●</span>
                                    {tracker.name}
                                </label>
                            ))}
                        </div>

                        <div className="border-t mt-4 pt-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={showCompletedVersions}
                                    onChange={(e) => setShowCompletedVersions(e.target.checked)}
                                    className="h-4 w-4 rounded border-input"
                                />
                                Show completed versions
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

                    {/* Versions Quick Links */}
                    <div className="border rounded p-4 bg-muted/30 mt-4">
                        <h3 className="font-semibold mb-3">Versions</h3>
                        <div className="space-y-1 text-sm">
                            {versions.map(v => (
                                <div key={v.id}>
                                    <Link
                                        href={`${projectUrl}/versions/${v.id}`}
                                        className="text-primary hover:underline"
                                    >
                                        {v.name}
                                    </Link>
                                    {v.effectiveDate && (
                                        <span className="text-muted-foreground ml-1">
                                            ({new Date(v.effectiveDate).toLocaleDateString("en-CA")})
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
