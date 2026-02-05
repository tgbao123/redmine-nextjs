"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Issue {
    id: number;
    subject: string;
    trackerName: string;
    trackerId: number;
    statusName: string;
    statusId: number;
    isClosed: boolean;
    priorityName: string;
    priorityId: number;
    assignee: string;
    assigneeId: number | null;
    dueDate: Date | null;
    doneRatio: number;
    updatedOn: Date | null;
}

interface Project {
    id: number;
    name: string;
    identifier: string | null;
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

interface Filters {
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

interface IssuesListProps {
    project: Project;
    issues: Issue[];
    totalCount: number;
    trackers: Tracker[];
    statuses: Status[];
    priorities: Priority[];
    members: Member[];
    versions: Version[];
    epics: string[];
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

function getTrackerColor(trackerName: string): string {
    const name = trackerName.toLowerCase();
    if (name.includes("bug")) return "text-red-600";
    if (name.includes("feature")) return "text-blue-600";
    if (name.includes("support")) return "text-green-600";
    if (name.includes("refactor")) return "text-purple-600";
    return "text-gray-600";
}

function getPriorityColor(priorityName: string): string {
    const name = priorityName.toLowerCase();
    if (name.includes("urgent") || name.includes("immediate")) return "text-red-700 font-bold";
    if (name.includes("high")) return "text-red-600";
    if (name.includes("low")) return "text-gray-500";
    return "text-gray-700";
}

function formatDateTime(date: Date | null): string {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
    }) + " " + d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatDateOnly(date: Date | null): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-CA"); // YYYY-MM-DD format
}

export function IssuesList({
    project,
    issues,
    totalCount,
    trackers,
    statuses,
    priorities,
    members,
    versions,
    epics,
    filters,
    modules
}: IssuesListProps) {
    const router = useRouter();
    const projectUrl = `/projects/${project.identifier || project.id}`;

    const [selectedStatusValues, setSelectedStatusValues] = useState<string[]>(() => {
        if (filters.status === "open" || filters.status === "*") return [];
        return filters.status.split(",").filter(Boolean);
    });
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    const [selectedVersionValues, setSelectedVersionValues] = useState<string[]>(() => {
        if (!filters.version) return [];
        return filters.version.split(",").filter(Boolean);
    });
    const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

    const [selectedEpicValues, setSelectedEpicValues] = useState<string[]>(() => {
        if (!filters.epic) return [];
        return filters.epic.split(",").filter(Boolean);
    });
    const [epicDropdownOpen, setEpicDropdownOpen] = useState(false);

    const [selectedTracker, setSelectedTracker] = useState(filters.tracker || "");
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || "");
    const [selectedAssignee, setSelectedAssignee] = useState(filters.assignee || "");

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

        if (newFilters.status && newFilters.status !== "open") params.set("status", newFilters.status);
        else if (newFilters.status === "open") { } // default, don't add

        if (newFilters.tracker) params.set("tracker", newFilters.tracker);
        if (newFilters.priority) params.set("priority", newFilters.priority);
        if (newFilters.assignee) params.set("assignee", newFilters.assignee);
        if (newFilters.version) params.set("version", newFilters.version);
        if (newFilters.epic) params.set("epic", newFilters.epic);
        if (newFilters.page > 1) params.set("page", String(newFilters.page));
        if (newFilters.perPage !== 25) params.set("per_page", String(newFilters.perPage));
        if (newFilters.sort && newFilters.sort !== "id") params.set("sort", newFilters.sort);
        if (newFilters.sortDir && newFilters.sortDir !== "desc") params.set("dir", newFilters.sortDir);

        const queryString = params.toString();
        return `${projectUrl}/issues${queryString ? `?${queryString}` : ""}`;
    };

    const handleSort = (field: string) => {
        const newDir = filters.sort === field && filters.sortDir === "desc" ? "asc" : "desc";
        router.push(buildUrl({ sort: field, sortDir: newDir, page: 1 }));
    };

    const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
        const isActive = filters.sort === field;
        const arrow = isActive ? (filters.sortDir === "desc" ? " ▼" : " ▲") : "";
        return (
            <th
                className="text-left px-3 py-2 font-medium cursor-pointer hover:bg-muted/70 select-none"
                onClick={() => handleSort(field)}
            >
                {children}{arrow}
            </th>
        );
    };

    const handleApplyFilters = () => {
        const statusValue = selectedStatusValues.length > 0 ? selectedStatusValues.join(",") : "open";
        const versionValue = selectedVersionValues.length > 0 ? selectedVersionValues.join(",") : undefined;
        const epicValue = selectedEpicValues.length > 0 ? selectedEpicValues.join(",") : undefined;
        router.push(buildUrl({
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
        setSelectedStatusValues([]);
        setSelectedVersionValues([]);
        setSelectedEpicValues([]);
        setSelectedTracker("");
        setSelectedPriority("");
        setSelectedAssignee("");
        router.push(`${projectUrl}/issues`);
    };

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
                        className={`px-3 py-2 text-sm whitespace-nowrap ${tab.id === "issue_tracking"
                            ? "font-medium bg-primary/10 text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-primary"
                            }`}
                    >
                        {tab.name}
                    </Link>
                ))}
            </div>

            {/* Issues Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Issues</h2>
                <Link
                    href={`${projectUrl}/issues/new`}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:bg-primary/90"
                >
                    + New Issue
                </Link>
            </div>

            {/* Filters */}
            <div className="border rounded p-4 bg-muted/30 space-y-3">
                <div className="text-sm font-medium">▼ Filters</div>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="relative">
                        <label className="block text-xs text-muted-foreground mb-1">Status</label>
                        <button
                            type="button"
                            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            className="border rounded px-2 py-1 text-sm min-w-[140px] text-left bg-background flex items-center justify-between gap-2"
                        >
                            <span className="truncate">
                                {selectedStatusValues.length === 0
                                    ? "All (open)"
                                    : selectedStatusValues.length === 1
                                        ? statuses.find(s => String(s.id) === selectedStatusValues[0])?.name
                                        : `${selectedStatusValues.length} selected`}
                            </span>
                            <span className="text-xs">▼</span>
                        </button>
                        {statusDropdownOpen && (
                            <div className="absolute z-50 mt-1 bg-background border rounded shadow-lg py-1 min-w-[160px]">
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

                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Tracker</label>
                        <select
                            value={selectedTracker}
                            onChange={(e) => setSelectedTracker(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            <option value="">All</option>
                            {trackers.map(t => (
                                <option key={t.id} value={String(t.id)}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Priority</label>
                        <select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            <option value="">All</option>
                            {priorities.map(p => (
                                <option key={p.id} value={String(p.id)}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Assignee</label>
                        <select
                            value={selectedAssignee}
                            onChange={(e) => setSelectedAssignee(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            <option value="">All</option>
                            {members.map(m => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                    </div>

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

            {/* Issues Table */}
            <div className="border rounded overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <SortHeader field="id">#</SortHeader>
                            <SortHeader field="tracker">Tracker</SortHeader>
                            <SortHeader field="status">Status</SortHeader>
                            <SortHeader field="priority">Priority</SortHeader>
                            <SortHeader field="subject">Subject</SortHeader>
                            <SortHeader field="assignee">Assignee</SortHeader>
                            <SortHeader field="updated">Updated</SortHeader>
                            <SortHeader field="due_date">Due date</SortHeader>
                            <SortHeader field="done_ratio">% Done</SortHeader>
                        </tr>
                    </thead>
                    <tbody>
                        {issues.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                                    No issues found.
                                </td>
                            </tr>
                        ) : (
                            issues.map((issue, idx) => (
                                <tr
                                    key={issue.id}
                                    className={`border-t hover:bg-muted/30 ${issue.isClosed ? 'line-through text-muted-foreground' : ''}`}
                                >
                                    <td className="px-3 py-2">
                                        <Link href={`/issues/${issue.id}`} className="text-primary hover:underline">
                                            {issue.id}
                                        </Link>
                                    </td>
                                    <td className={`px-3 py-2 ${getTrackerColor(issue.trackerName)}`}>
                                        {issue.trackerName}
                                    </td>
                                    <td className="px-3 py-2">{issue.statusName}</td>
                                    <td className={`px-3 py-2 ${getPriorityColor(issue.priorityName)}`}>
                                        {issue.priorityName}
                                    </td>
                                    <td className="px-3 py-2">
                                        <Link href={`/issues/${issue.id}`} className="hover:underline">
                                            {issue.subject}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2">
                                        {issue.assigneeId ? (
                                            <Link href={`/users/${issue.assigneeId}`} className="text-primary hover:underline">
                                                {issue.assignee}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                        {formatDateTime(issue.updatedOn)}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                        {formatDateOnly(issue.dueDate)}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-1">
                                            <div className="w-16 bg-gray-200 rounded h-2 overflow-hidden">
                                                <div
                                                    className="bg-green-500 h-full"
                                                    style={{ width: `${issue.doneRatio}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{issue.doneRatio}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                        ({startItem}-{endItem}/{totalCount}) Per page:
                        <select
                            value={filters.perPage}
                            onChange={(e) => router.push(buildUrl({ perPage: parseInt(e.target.value), page: 1 }))}
                            className="ml-1 border rounded px-1"
                        >
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        {filters.page > 1 && (
                            <>
                                <Link
                                    href={buildUrl({ page: filters.page - 1 })}
                                    className="px-2 py-1 hover:bg-muted rounded"
                                >
                                    « Previous
                                </Link>
                            </>
                        )}

                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (filters.page <= 3) {
                                pageNum = i + 1;
                            } else if (filters.page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = filters.page - 2 + i;
                            }

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

                        {filters.page < totalPages && (
                            <Link
                                href={buildUrl({ page: filters.page + 1 })}
                                className="px-2 py-1 hover:bg-muted rounded"
                            >
                                Next »
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
