"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Project {
    id: number;
    identifier: string | null;
    name: string;
}

interface TimeEntry {
    id: number;
    date: Date;
    userId: number;
    userName: string;
    activity: string;
    issueId: number | null;
    issueSubject: string | null;
    issueTracker: string | null;
    comments: string | null;
    hours: number;
}

interface Tracker {
    id: number;
    name: string;
}

interface Status {
    id: number;
    name: string;
    is_closed: boolean;
}

interface Priority {
    id: number;
    name: string;
}

interface Member {
    id: number;
    name: string;
}

interface Version {
    id: number;
    name: string;
}

interface Activity {
    id: number;
    name: string;
}

interface Filters {
    date?: string;
    status: string;
    tracker?: string;
    priority?: string;
    assignee?: string;
    version?: string;
    epic?: string;
    page: number;
    perPage: number;
    sort: string;
    sortDir: "asc" | "desc";
}

interface TimeEntriesListProps {
    project: Project;
    timeEntries: TimeEntry[];
    totalCount: number;
    totalHours: number;
    trackers: Tracker[];
    statuses: Status[];
    priorities: Priority[];
    members: Member[];
    versions: Version[];
    epics: string[];
    activities: Activity[];
    filters: Filters;
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

function formatDate(date: Date | null): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-CA");
}

function formatHours(hours: number): string {
    return hours.toFixed(2);
}

export function TimeEntriesList({
    project,
    timeEntries,
    totalCount,
    totalHours,
    trackers,
    statuses,
    priorities,
    members,
    versions,
    epics,
    activities,
    filters,
    modules
}: TimeEntriesListProps) {
    const router = useRouter();
    const projectUrl = `/projects/${project.identifier || project.id}`;

    // Date filter
    const [selectedDate, setSelectedDate] = useState(filters.date || "any");

    // Status multi-select
    const [selectedStatusValues, setSelectedStatusValues] = useState<string[]>(() => {
        if (filters.status === "open" || filters.status === "*") return [];
        return filters.status.split(",").filter(Boolean);
    });
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    // Single selects
    const [selectedTracker, setSelectedTracker] = useState(filters.tracker || "");
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || "");
    const [selectedAssignee, setSelectedAssignee] = useState(filters.assignee || "");

    // Version multi-select
    const [selectedVersionValues, setSelectedVersionValues] = useState<string[]>(() => {
        if (!filters.version) return [];
        return filters.version.split(",").filter(Boolean);
    });
    const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

    // Epic multi-select
    const [selectedEpicValues, setSelectedEpicValues] = useState<string[]>(() => {
        if (!filters.epic) return [];
        return filters.epic.split(",").filter(Boolean);
    });
    const [epicDropdownOpen, setEpicDropdownOpen] = useState(false);

    const visibleTabs = MODULE_TABS.filter(tab => {
        if (tab.module === null) return true;
        return modules.includes(tab.module);
    });

    const totalPages = Math.ceil(totalCount / filters.perPage);
    const startItem = (filters.page - 1) * filters.perPage + 1;
    const endItem = Math.min(filters.page * filters.perPage, totalCount);

    const buildUrl = (overrides: Partial<Filters> = {}) => {
        const params = new URLSearchParams();
        const newFilters = { ...filters, ...overrides };

        if (newFilters.date && newFilters.date !== "any") params.set("date", newFilters.date);
        if (newFilters.status && newFilters.status !== "open") params.set("status", newFilters.status);
        if (newFilters.tracker) params.set("tracker", newFilters.tracker);
        if (newFilters.priority) params.set("priority", newFilters.priority);
        if (newFilters.assignee) params.set("assignee", newFilters.assignee);
        if (newFilters.version) params.set("version", newFilters.version);
        if (newFilters.epic) params.set("epic", newFilters.epic);
        if (newFilters.page > 1) params.set("page", String(newFilters.page));
        if (newFilters.perPage !== 25) params.set("per_page", String(newFilters.perPage));
        if (newFilters.sort && newFilters.sort !== "date") params.set("sort", newFilters.sort);
        if (newFilters.sortDir !== "desc") params.set("sort_dir", newFilters.sortDir);

        const queryString = params.toString();
        return `${projectUrl}/time_entries${queryString ? `?${queryString}` : ""}`;
    };

    const getSortUrl = (column: string) => {
        const newDir = filters.sort === column && filters.sortDir === "desc" ? "asc" : "desc";
        return buildUrl({ sort: column, sortDir: newDir, page: 1 });
    };

    const SortHeader = ({ column, label, align = "left" }: { column: string; label: string; align?: "left" | "right" }) => {
        const isActive = filters.sort === column;
        const arrow = isActive ? (filters.sortDir === "desc" ? " ▼" : " ▲") : "";
        return (
            <th className={`text-${align} px-3 py-2 font-medium`}>
                <Link
                    href={getSortUrl(column)}
                    className={`hover:underline ${isActive ? "text-primary" : ""}`}
                >
                    {label}{arrow}
                </Link>
            </th>
        );
    };

    const handleApplyFilters = () => {
        const statusValue = selectedStatusValues.length > 0 ? selectedStatusValues.join(",") : "open";
        const versionValue = selectedVersionValues.length > 0 ? selectedVersionValues.join(",") : undefined;
        const epicValue = selectedEpicValues.length > 0 ? selectedEpicValues.join(",") : undefined;
        router.push(buildUrl({
            date: selectedDate !== "any" ? selectedDate : undefined,
            status: statusValue,
            tracker: selectedTracker || undefined,
            priority: selectedPriority || undefined,
            assignee: selectedAssignee || undefined,
            version: versionValue,
            epic: epicValue,
            page: 1
        }));
    };

    const handleClearFilters = () => {
        setSelectedDate("any");
        setSelectedStatusValues([]);
        setSelectedTracker("");
        setSelectedPriority("");
        setSelectedAssignee("");
        setSelectedVersionValues([]);
        setSelectedEpicValues([]);
        router.push(`${projectUrl}/time_entries`);
    };

    return (
        <div className="space-y-4">
            {/* Project Header */}
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-t">
                <Link href={projectUrl} className="font-semibold hover:underline">
                    {project.name}
                </Link>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b overflow-x-auto">
                {visibleTabs.map(tab => (
                    <Link
                        key={tab.id}
                        href={`${projectUrl}${tab.href}`}
                        className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${tab.id === "time_tracking"
                            ? "border-primary text-primary font-medium"
                            : "border-transparent hover:border-muted-foreground/50"
                            }`}
                    >
                        {tab.name}
                    </Link>
                ))}
            </div>

            {/* Page Title */}
            <h2 className="text-xl font-semibold">Spent time</h2>

            {/* Filters */}
            <div className="border rounded p-4 bg-muted/30 space-y-3">
                <div className="text-sm font-medium">▼ Filters</div>
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Date Filter */}
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Date</label>
                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border rounded px-2 py-1 text-sm bg-background"
                        >
                            <option value="any">any</option>
                            <option value="today">today</option>
                            <option value="yesterday">yesterday</option>
                            <option value="this_week">this week</option>
                            <option value="last_week">last week</option>
                            <option value="last_2_weeks">last 2 weeks</option>
                            <option value="this_month">this month</option>
                            <option value="last_month">last month</option>
                            <option value="this_year">this year</option>
                        </select>
                    </div>

                    {/* Status Multi-Select */}
                    <div className="relative">
                        <label className="block text-xs text-muted-foreground mb-1">Status</label>
                        <button
                            type="button"
                            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            className="border rounded px-2 py-1 text-sm min-w-[120px] text-left bg-background flex items-center justify-between gap-2"
                        >
                            <span className="truncate">
                                {selectedStatusValues.length === 0
                                    ? "Open"
                                    : selectedStatusValues.length === 1
                                        ? statuses.find(s => String(s.id) === selectedStatusValues[0])?.name
                                        : `${selectedStatusValues.length} selected`}
                            </span>
                            <span className="text-xs">▼</span>
                        </button>
                        {statusDropdownOpen && (
                            <div className="absolute z-50 mt-1 bg-background border rounded shadow-lg py-1 min-w-[160px] max-h-60 overflow-y-auto">
                                {statuses.map(s => (
                                    <label
                                        key={s.id}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStatusValues.includes(String(s.id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedStatusValues([...selectedStatusValues, String(s.id)]);
                                                } else {
                                                    setSelectedStatusValues(selectedStatusValues.filter(v => v !== String(s.id)));
                                                }
                                            }}
                                            className="h-4 w-4"
                                        />
                                        {s.name}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tracker */}
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Tracker</label>
                        <select
                            value={selectedTracker}
                            onChange={(e) => setSelectedTracker(e.target.value)}
                            className="border rounded px-2 py-1 text-sm bg-background"
                        >
                            <option value="">All</option>
                            {trackers.map(t => (
                                <option key={t.id} value={String(t.id)}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Priority</label>
                        <select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                            className="border rounded px-2 py-1 text-sm bg-background"
                        >
                            <option value="">All</option>
                            {priorities.map(p => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Assignee</label>
                        <select
                            value={selectedAssignee}
                            onChange={(e) => setSelectedAssignee(e.target.value)}
                            className="border rounded px-2 py-1 text-sm bg-background"
                        >
                            <option value="">All</option>
                            {members.map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Target Version Multi-Select */}
                    <div className="relative">
                        <label className="block text-xs text-muted-foreground mb-1">Target Version</label>
                        <button
                            type="button"
                            onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                            className="border rounded px-2 py-1 text-sm min-w-[140px] text-left bg-background flex items-center justify-between gap-2"
                        >
                            <span className="truncate">
                                {selectedVersionValues.length === 0
                                    ? "All"
                                    : selectedVersionValues.length === 1
                                        ? versions.find(v => String(v.id) === selectedVersionValues[0])?.name
                                        : `${selectedVersionValues.length} selected`}
                            </span>
                            <span className="text-xs">▼</span>
                        </button>
                        {versionDropdownOpen && (
                            <div className="absolute z-50 mt-1 bg-background border rounded shadow-lg py-1 min-w-[160px] max-h-60 overflow-y-auto">
                                {versions.map(v => (
                                    <label
                                        key={v.id}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedVersionValues.includes(String(v.id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedVersionValues([...selectedVersionValues, String(v.id)]);
                                                } else {
                                                    setSelectedVersionValues(selectedVersionValues.filter(x => x !== String(v.id)));
                                                }
                                            }}
                                            className="h-4 w-4"
                                        />
                                        {v.name}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Epic Multi-Select */}
                    {epics.length > 0 && (
                        <div className="relative">
                            <label className="block text-xs text-muted-foreground mb-1">Epic</label>
                            <button
                                type="button"
                                onClick={() => setEpicDropdownOpen(!epicDropdownOpen)}
                                className="border rounded px-2 py-1 text-sm min-w-[140px] text-left bg-background flex items-center justify-between gap-2"
                            >
                                <span className="truncate">
                                    {selectedEpicValues.length === 0
                                        ? "All"
                                        : selectedEpicValues.length === 1
                                            ? selectedEpicValues[0]
                                            : `${selectedEpicValues.length} selected`}
                                </span>
                                <span className="text-xs">▼</span>
                            </button>
                            {epicDropdownOpen && (
                                <div className="absolute z-50 mt-1 bg-background border rounded shadow-lg py-1 min-w-[180px] max-h-60 overflow-y-auto">
                                    {epics.map(epic => (
                                        <label
                                            key={epic}
                                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedEpicValues.includes(epic)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedEpicValues([...selectedEpicValues, epic]);
                                                    } else {
                                                        setSelectedEpicValues(selectedEpicValues.filter(x => x !== epic));
                                                    }
                                                }}
                                                className="h-4 w-4"
                                            />
                                            {epic}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button onClick={handleApplyFilters} size="sm">
                            Apply
                        </Button>
                        <Button onClick={handleClearFilters} size="sm" variant="outline">
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            {/* Time Entries Summary */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>
                    {totalCount === 0
                        ? "No entries"
                        : `${startItem}-${endItem}/${totalCount}`}
                </span>
                <span className="font-semibold text-foreground">
                    Hours: {formatHours(totalHours)}
                </span>
            </div>

            {/* Time Entries Table */}
            <div className="border rounded overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <SortHeader column="date" label="Date" />
                            <SortHeader column="user" label="User" />
                            <SortHeader column="activity" label="Activity" />
                            <th className="text-left px-3 py-2 font-medium">Issue</th>
                            <th className="text-left px-3 py-2 font-medium">Comment</th>
                            <SortHeader column="hours" label="Hours" align="right" />
                        </tr>
                    </thead>
                    <tbody>
                        {timeEntries.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No time entries found
                                </td>
                            </tr>
                        ) : (
                            timeEntries.map(entry => (
                                <tr key={entry.id} className="border-t hover:bg-muted/30">
                                    <td className="px-3 py-2">{formatDate(entry.date)}</td>
                                    <td className="px-3 py-2">
                                        <Link
                                            href={`/users/${entry.userId}`}
                                            className="text-primary hover:underline"
                                        >
                                            {entry.userName}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2">{entry.activity}</td>
                                    <td className="px-3 py-2">
                                        {entry.issueId ? (
                                            <Link
                                                href={`/issues/${entry.issueId}`}
                                                className="text-primary hover:underline"
                                            >
                                                {entry.issueTracker} #{entry.issueId}: {entry.issueSubject}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        {entry.comments || <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                        {formatHours(entry.hours)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex gap-1 items-center text-sm">
                    {filters.page > 1 && (
                        <Link
                            href={buildUrl({ page: filters.page - 1 })}
                            className="px-2 py-1 text-primary hover:underline"
                        >
                            « Previous
                        </Link>
                    )}
                    {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                            <Link
                                key={pageNum}
                                href={buildUrl({ page: pageNum })}
                                className={`px-2 py-1 rounded ${pageNum === filters.page
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                    }`}
                            >
                                {pageNum}
                            </Link>
                        );
                    })}
                    {totalPages > 10 && <span className="px-2">...</span>}
                    {filters.page < totalPages && (
                        <Link
                            href={buildUrl({ page: filters.page + 1 })}
                            className="px-2 py-1 text-primary hover:underline"
                        >
                            Next »
                        </Link>
                    )}
                    <span className="text-muted-foreground ml-2">
                        ({startItem}-{endItem}/{totalCount}) Per page:
                        {[25, 50, 100].map(n => (
                            <Link
                                key={n}
                                href={buildUrl({ perPage: n, page: 1 })}
                                className={`ml-1 ${filters.perPage === n ? "font-bold" : "text-primary hover:underline"}`}
                            >
                                {n}
                            </Link>
                        ))}
                    </span>
                </div>
            )}
        </div>
    );
}
