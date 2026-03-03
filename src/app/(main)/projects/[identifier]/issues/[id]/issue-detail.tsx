"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateIssueAction, addNoteAction, deleteIssueAction } from "@/lib/issues/actions";
import { PermissionProvider, usePermission } from "@/components/providers/permission-provider";
import ReactMarkdown from "react-markdown";

// ─── Types ───

interface NamedEntity { id: number; name: string }
interface IssueData {
    id: number;
    subject: string;
    description: string;
    tracker: NamedEntity;
    status: NamedEntity & { isClosed: boolean };
    priority: NamedEntity;
    author: NamedEntity | null;
    assignee: NamedEntity | null;
    category: NamedEntity | null;
    version: NamedEntity | null;
    parentIssue: { id: number; subject: string; tracker: string; status: string } | null;
    startDate: string | null;
    dueDate: string | null;
    estimatedHours: number | null;
    doneRatio: number;
    isPrivate: boolean;
    createdOn: string;
    updatedOn: string;
    spentHours: number;
}

interface ChildIssue {
    id: number; subject: string; tracker: string; status: string;
    isClosed: boolean; assignee: string; doneRatio: number;
}

interface Relation {
    id: number; relationType: string; delay: number | null; isFrom: boolean;
    otherIssue: { id: number; subject: string; tracker: string; status: string; isClosed: boolean } | null;
}

interface JournalEntry {
    id: number; notes: string; privateNotes: boolean;
    author: NamedEntity; createdOn: string;
    details: { property: string; propKey: string; oldValue: string | null; newValue: string | null }[];
}

interface CustomField { id: number; name: string; format: string; value: string }

interface Status { id: number; name: string; is_closed: boolean }

interface Props {
    project: { id: number; name: string; identifier: string | null };
    issue: IssueData;
    childIssues: ChildIssue[];
    relations: Relation[];
    journals: JournalEntry[];
    customFields: CustomField[];
    watchers: NamedEntity[];
    statuses: Status[];
    trackers: NamedEntity[];
    priorities: NamedEntity[];
    members: NamedEntity[];
    versions: NamedEntity[];
    categories: NamedEntity[];
    permissions: string[];
    isAdmin: boolean;
    currentUserId: number;
    modules: string[];
}

// ─── Module Tabs (reused from issues-list) ───

const MODULE_TABS = [
    { id: "overview", name: "Overview", href: "", module: null },
    { id: "activity", name: "Activity", href: "/activity", module: null },
    { id: "roadmap", name: "Roadmap", href: "/roadmap", module: null },
    { id: "issues", name: "Issues", href: "/issues", module: "issue_tracking" },
    { id: "time", name: "Spent time", href: "/time_entries", module: "time_tracking" },
    { id: "wiki", name: "Wiki", href: "/wiki", module: "wiki" },
    { id: "settings", name: "Settings", href: "/settings", module: null },
];

// ─── Helpers ───

const RELATION_LABELS: Record<string, string> = {
    relates: "Related to",
    duplicates: "Duplicates",
    duplicated: "Duplicated by",
    blocks: "Blocks",
    blocked: "Blocked by",
    precedes: "Precedes",
    follows: "Follows",
    copied_to: "Copied to",
    copied_from: "Copied from",
};

function formatDate(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTime(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

// ─── Main Component ───

export function IssueDetail(props: Props) {
    return (
        <PermissionProvider permissions={props.permissions} isAdmin={props.isAdmin}>
            <IssueDetailContent {...props} />
        </PermissionProvider>
    );
}

function IssueDetailContent({
    project, issue, childIssues, relations, journals,
    customFields, watchers, statuses, trackers, priorities,
    members, versions, categories, permissions, isAdmin,
    currentUserId, modules,
}: Props) {
    const router = useRouter();
    const { can } = usePermission();
    const [isPending, startTransition] = useTransition();
    const [notes, setNotes] = useState("");
    const [editingStatus, setEditingStatus] = useState(issue.status.id);
    const [editingAssignee, setEditingAssignee] = useState<number | null>(issue.assignee?.id || null);
    const [editingDoneRatio, setEditingDoneRatio] = useState(issue.doneRatio);
    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const basePath = `/projects/${project.identifier}`;

    const handleUpdate = async () => {
        if (!notes && editingStatus === issue.status.id && editingAssignee === (issue.assignee?.id || null) && editingDoneRatio === issue.doneRatio) return;

        startTransition(async () => {
            const result = await updateIssueAction(
                project.identifier || "",
                issue.id,
                project.id,
                {
                    statusId: editingStatus !== issue.status.id ? editingStatus : undefined,
                    assignedToId: editingAssignee !== (issue.assignee?.id || null) ? editingAssignee : undefined,
                    doneRatio: editingDoneRatio !== issue.doneRatio ? editingDoneRatio : undefined,
                    notes: notes || undefined,
                }
            );

            if (result.success) {
                setNotes("");
                setShowUpdateForm(false);
                setError(null);
                router.refresh();
            } else {
                setError(result.error || "Update failed");
            }
        });
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete issue #${issue.id}?`)) return;

        startTransition(async () => {
            const result = await deleteIssueAction(project.identifier || "", issue.id, project.id);
            if (result.success) {
                router.push(`${basePath}/issues`);
            } else {
                setError(result.error || "Delete failed");
            }
        });
    };

    // Tab navigation
    const visibleTabs = MODULE_TABS.filter(
        (tab) => tab.module === null || modules.includes(tab.module)
    );

    return (
        <div className="space-y-0">
            {/* Project Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link>
                </h1>
            </div>

            {/* Tab Navigation */}
            <div className="border-b bg-gray-50 dark:bg-gray-800/50 px-4">
                <nav className="flex gap-0 overflow-x-auto">
                    {visibleTabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`${basePath}${tab.href}`}
                            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab.id === "issues"
                                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            {tab.name}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Issue Content */}
            <div className="px-6 py-4 space-y-6">
                {/* Issue Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span className={`text-sm px-2 py-0.5 rounded font-medium ${issue.tracker.name === "Bug" ? "bg-red-100 text-red-700" :
                                    issue.tracker.name === "Feature" ? "bg-blue-100 text-blue-700" :
                                        "bg-green-100 text-green-700"
                                }`}>
                                {issue.tracker.name}
                            </span>
                            #{issue.id}
                        </h2>
                        <h3 className="text-xl font-semibold mt-1">{issue.subject}</h3>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        {can("edit_issues") && (
                            <Link href={`${basePath}/issues/${issue.id}/edit`}>
                                <Button variant="outline" size="sm">Edit</Button>
                            </Link>
                        )}
                        {can("delete_issues") && (
                            <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={isPending}>
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Added by <strong>{issue.author?.name || "Unknown"}</strong> {timeAgo(issue.createdOn)}</span>
                    <span>·</span>
                    <span>Updated {timeAgo(issue.updatedOn)}</span>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
                )}

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left — Description + History */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Description */}
                        {issue.description && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-2">Description</h4>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{issue.description}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {/* Sub-tasks */}
                        {childIssues.length > 0 && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-2">Subtasks ({childIssues.length})</h4>
                                <div className="space-y-1">
                                    {childIssues.map((ci) => (
                                        <div key={ci.id} className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-400">{ci.tracker}</span>
                                            <Link href={`${basePath}/issues/${ci.id}`} className={`hover:underline ${ci.isClosed ? "line-through text-gray-400" : "text-blue-600"}`}>
                                                #{ci.id}
                                            </Link>
                                            <span className={ci.isClosed ? "line-through text-gray-400" : ""}>{ci.subject}</span>
                                            {ci.doneRatio > 0 && (
                                                <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                                                    <div className="h-full bg-green-500 rounded" style={{ width: `${ci.doneRatio}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Relations */}
                        {relations.length > 0 && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-2">Relations</h4>
                                <div className="space-y-1">
                                    {relations.map((r) => r.otherIssue && (
                                        <div key={r.id} className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-500">{RELATION_LABELS[r.relationType] || r.relationType}</span>
                                            <Link href={`${basePath}/issues/${r.otherIssue.id}`} className={`hover:underline ${r.otherIssue.isClosed ? "line-through text-gray-400" : "text-blue-600"}`}>
                                                {r.otherIssue.tracker} #{r.otherIssue.id}
                                            </Link>
                                            <span className={r.otherIssue.isClosed ? "text-gray-400" : ""}>{r.otherIssue.subject}</span>
                                            {r.delay && <span className="text-gray-400">({r.delay} days)</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Update Form */}
                        {can("add_issue_notes") && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-3 cursor-pointer" onClick={() => setShowUpdateForm(!showUpdateForm)}>
                                    {showUpdateForm ? "▼" : "▶"} Update
                                </h4>

                                {showUpdateForm && (
                                    <div className="space-y-3">
                                        {can("edit_issues") && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500">Status</label>
                                                    <select value={editingStatus} onChange={(e) => setEditingStatus(Number(e.target.value))}
                                                        className="w-full border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800">
                                                        {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500">Assignee</label>
                                                    <select value={editingAssignee || ""} onChange={(e) => setEditingAssignee(e.target.value ? Number(e.target.value) : null)}
                                                        className="w-full border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800">
                                                        <option value="">-- Unassigned --</option>
                                                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500">% Done</label>
                                                    <select value={editingDoneRatio} onChange={(e) => setEditingDoneRatio(Number(e.target.value))}
                                                        className="w-full border rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800">
                                                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                                                            <option key={v} value={v}>{v}%</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Notes</label>
                                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                                className="w-full border rounded px-3 py-2 text-sm min-h-[80px] bg-white dark:bg-gray-800"
                                                placeholder="Add a note..." />
                                        </div>

                                        <Button onClick={handleUpdate} disabled={isPending} size="sm">
                                            {isPending ? "Updating..." : "Submit"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History / Journal */}
                        {journals.length > 0 && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-3">History</h4>
                                <div className="space-y-4">
                                    {journals.map((j, index) => (
                                        <div key={j.id} className="border-l-2 border-gray-200 pl-4 py-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    Updated by {j.author.name}
                                                </span>
                                                <span>·</span>
                                                <span title={formatDateTime(j.createdOn)}>{timeAgo(j.createdOn)}</span>
                                                <span className="text-gray-400">#{index + 1}</span>
                                            </div>

                                            {/* Property changes */}
                                            {j.details.length > 0 && (
                                                <ul className="mt-1 space-y-0.5">
                                                    {j.details.map((d, di) => (
                                                        <li key={di} className="text-xs text-gray-600 dark:text-gray-400">
                                                            <PropertyChange detail={d} statuses={statuses} trackers={trackers} priorities={priorities} members={members} />
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            {/* Notes */}
                                            {j.notes && (
                                                <div className="mt-2 text-sm bg-gray-50 dark:bg-gray-800 rounded p-2">
                                                    <ReactMarkdown>{j.notes}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right sidebar — Properties */}
                    <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                            <h4 className="font-semibold text-sm text-gray-500 mb-3">Properties</h4>
                            <dl className="space-y-2 text-sm">
                                <PropertyRow label="Status">
                                    <span className={`font-medium ${issue.status.isClosed ? "text-gray-400" : "text-green-600"}`}>
                                        {issue.status.name}
                                    </span>
                                </PropertyRow>
                                <PropertyRow label="Priority">
                                    <span className={
                                        issue.priority.name === "Urgent" || issue.priority.name === "Immediate" ? "text-red-600 font-bold" :
                                            issue.priority.name === "High" ? "text-orange-600 font-medium" :
                                                ""
                                    }>
                                        {issue.priority.name}
                                    </span>
                                </PropertyRow>
                                <PropertyRow label="Assignee">{issue.assignee?.name || <span className="text-gray-400">—</span>}</PropertyRow>
                                <PropertyRow label="Category">{issue.category?.name || <span className="text-gray-400">—</span>}</PropertyRow>
                                <PropertyRow label="Target version">
                                    {issue.version ? (
                                        <Link href={`${basePath}/roadmap`} className="text-blue-600 hover:underline">{issue.version.name}</Link>
                                    ) : <span className="text-gray-400">—</span>}
                                </PropertyRow>

                                <hr className="my-2 border-gray-200 dark:border-gray-700" />

                                <PropertyRow label="Start date">{issue.startDate || <span className="text-gray-400">—</span>}</PropertyRow>
                                <PropertyRow label="Due date">
                                    {issue.dueDate ? (
                                        <span className={new Date(issue.dueDate) < new Date() && !issue.status.isClosed ? "text-red-600 font-medium" : ""}>
                                            {issue.dueDate}
                                        </span>
                                    ) : <span className="text-gray-400">—</span>}
                                </PropertyRow>
                                <PropertyRow label="% Done">
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-3 bg-gray-200 rounded overflow-hidden">
                                            <div className="h-full bg-green-500 rounded" style={{ width: `${issue.doneRatio}%` }} />
                                        </div>
                                        <span>{issue.doneRatio}%</span>
                                    </div>
                                </PropertyRow>
                                <PropertyRow label="Estimated hours">{issue.estimatedHours ? `${issue.estimatedHours}h` : <span className="text-gray-400">—</span>}</PropertyRow>
                                <PropertyRow label="Spent time">
                                    {issue.spentHours > 0 ? (
                                        <Link href={`${basePath}/time_entries?issue_id=${issue.id}`} className="text-blue-600 hover:underline">
                                            {issue.spentHours.toFixed(2)}h
                                        </Link>
                                    ) : <span className="text-gray-400">—</span>}
                                </PropertyRow>
                            </dl>
                        </div>

                        {/* Parent Issue */}
                        {issue.parentIssue && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-2">Parent task</h4>
                                <Link href={`${basePath}/issues/${issue.parentIssue.id}`} className="text-sm text-blue-600 hover:underline">
                                    {issue.parentIssue.tracker} #{issue.parentIssue.id}: {issue.parentIssue.subject}
                                </Link>
                            </div>
                        )}

                        {/* Custom Fields */}
                        {customFields.length > 0 && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-2">Custom fields</h4>
                                <dl className="space-y-2 text-sm">
                                    {customFields.map((cf) => (
                                        <PropertyRow key={cf.id} label={cf.name}>
                                            {cf.value || <span className="text-gray-400">—</span>}
                                        </PropertyRow>
                                    ))}
                                </dl>
                            </div>
                        )}

                        {/* Watchers */}
                        {watchers.length > 0 && (
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                                <h4 className="font-semibold text-sm text-gray-500 mb-2">Watchers ({watchers.length})</h4>
                                <ul className="space-y-1 text-sm">
                                    {watchers.map((w) => (
                                        <li key={w.id} className="text-gray-700 dark:text-gray-300">{w.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ───

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start">
            <dt className="text-gray-500 font-medium">{label}:</dt>
            <dd className="text-right">{children}</dd>
        </div>
    );
}

function PropertyChange({
    detail, statuses, trackers, priorities, members,
}: {
    detail: { property: string; propKey: string; oldValue: string | null; newValue: string | null };
    statuses: Status[];
    trackers: NamedEntity[];
    priorities: NamedEntity[];
    members: NamedEntity[];
}) {
    const resolve = (propKey: string, value: string | null): string => {
        if (!value) return "(none)";
        const id = parseInt(value);

        switch (propKey) {
            case "status_id":
                return statuses.find((s) => s.id === id)?.name || value;
            case "tracker_id":
                return trackers.find((t) => t.id === id)?.name || value;
            case "priority_id":
                return priorities.find((p) => p.id === id)?.name || value;
            case "assigned_to_id":
                return members.find((m) => m.id === id)?.name || value;
            default:
                return value;
        }
    };

    const fieldName = detail.propKey.replace(/_id$/, "").replace(/_/g, " ");
    const oldVal = resolve(detail.propKey, detail.oldValue);
    const newVal = resolve(detail.propKey, detail.newValue);

    if (detail.property === "cf") {
        return <span>Custom field #{detail.propKey} changed from <em>{oldVal}</em> to <em>{newVal}</em></span>;
    }

    if (!detail.oldValue && detail.newValue) {
        return <span><strong>{fieldName}</strong> set to <em>{newVal}</em></span>;
    }
    if (detail.oldValue && !detail.newValue) {
        return <span><strong>{fieldName}</strong> deleted (<del>{oldVal}</del>)</span>;
    }
    return <span><strong>{fieldName}</strong> changed from <em>{oldVal}</em> to <em>{newVal}</em></span>;
}
