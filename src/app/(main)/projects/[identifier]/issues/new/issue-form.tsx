"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createIssueAction, updateIssueAction } from "@/lib/issues/actions";

// ─── Types ───

interface NamedEntity { id: number; name: string }
interface CustomFieldDef {
    id: number; name: string; format: string;
    possibleValues: string | null; isRequired: boolean; defaultValue: string | null;
}

interface AttachmentInfo {
    id: number; filename: string; filesize: number; createdOn: string;
}

interface Props {
    project: { id: number; name: string; identifier: string | null };
    trackers: NamedEntity[];
    statuses: { id: number; name: string; is_closed: boolean }[];
    priorities: NamedEntity[];
    members: NamedEntity[];
    versions: NamedEntity[];
    categories: NamedEntity[];
    customFields: CustomFieldDef[];
    defaultStatusId: number;
    defaultPriorityId: number;
    defaultTrackerId: number;
    // Edit mode
    editMode?: boolean;
    issueId?: number;
    activities?: NamedEntity[];
    attachments?: AttachmentInfo[];
    modules?: string[];
    initialValues?: {
        subject: string;
        description: string;
        trackerId: number;
        statusId: number;
        priorityId: number;
        assignedToId: number | null;
        categoryId: number | null;
        fixedVersionId: number | null;
        parentId: number | null;
        startDate: string;
        dueDate: string;
        estimatedHours: string;
        doneRatio: number;
        isPrivate: boolean;
        customFieldValues: Record<number, string>;
    };
}

const MODULE_TABS = [
    { id: "overview", name: "Overview", href: "", module: null },
    { id: "activity", name: "Activity", href: "/activity", module: null },
    { id: "roadmap", name: "Roadmap", href: "/roadmap", module: null },
    { id: "issues", name: "Issues", href: "/issues", module: "issue_tracking" },
    { id: "time", name: "Spent time", href: "/time_entries", module: "time_tracking" },
    { id: "wiki", name: "Wiki", href: "/wiki", module: "wiki" },
    { id: "boards", name: "Forums", href: "/boards", module: "boards" },
    { id: "settings", name: "Settings", href: "/settings", module: null },
];

export function IssueForm({
    project, trackers, statuses, priorities, members,
    versions, categories, customFields,
    defaultStatusId, defaultPriorityId, defaultTrackerId,
    editMode = false, issueId, initialValues,
    activities = [], attachments = [], modules = [],
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Form state — core properties
    const [subject, setSubject] = useState(initialValues?.subject || "");
    const [description, setDescription] = useState(initialValues?.description || "");
    const [trackerId, setTrackerId] = useState(initialValues?.trackerId || defaultTrackerId);
    const [statusId, setStatusId] = useState(initialValues?.statusId || defaultStatusId);
    const [priorityId, setPriorityId] = useState(initialValues?.priorityId || defaultPriorityId);
    const [assignedToId, setAssignedToId] = useState<string>(initialValues?.assignedToId?.toString() || "");
    const [categoryId, setCategoryId] = useState<string>(initialValues?.categoryId?.toString() || "");
    const [fixedVersionId, setFixedVersionId] = useState<string>(initialValues?.fixedVersionId?.toString() || "");
    const [parentId, setParentId] = useState<string>(initialValues?.parentId?.toString() || "");
    const [startDate, setStartDate] = useState(initialValues?.startDate || "");
    const [dueDate, setDueDate] = useState(initialValues?.dueDate || "");
    const [estimatedHours, setEstimatedHours] = useState(initialValues?.estimatedHours || "");
    const [doneRatio, setDoneRatio] = useState(initialValues?.doneRatio || 0);
    const [isPrivate, setIsPrivate] = useState(initialValues?.isPrivate || false);
    const [cfValues, setCfValues] = useState<Record<number, string>>(
        initialValues?.customFieldValues || Object.fromEntries(customFields.map((cf) => [cf.id, cf.defaultValue || ""]))
    );

    // Edit mode only — Log time
    const [spentTime, setSpentTime] = useState("");
    const [activityId, setActivityId] = useState<string>("");
    const [timeComment, setTimeComment] = useState("");

    // Edit mode only — Notes
    const [notes, setNotes] = useState("");
    const [privateNotes, setPrivateNotes] = useState(false);

    const basePath = `/projects/${project.identifier}`;

    const handleSubmit = async (e: React.FormEvent, andContinue: boolean = false) => {
        e.preventDefault();
        if (!subject.trim()) {
            setError("Subject is required");
            return;
        }

        startTransition(async () => {
            const customFieldsData = Object.entries(cfValues)
                .filter(([, v]) => v !== "")
                .map(([k, v]) => ({ fieldId: parseInt(k), value: v }));

            if (editMode && issueId) {
                // Update existing issue
                const result = await updateIssueAction(
                    project.identifier || "",
                    issueId,
                    project.id,
                    {
                        subject: subject.trim(),
                        description: description.trim(),
                        trackerId,
                        statusId,
                        priorityId,
                        assignedToId: assignedToId ? parseInt(assignedToId) : null,
                        categoryId: categoryId ? parseInt(categoryId) : null,
                        fixedVersionId: fixedVersionId ? parseInt(fixedVersionId) : null,
                        parentId: parentId ? parseInt(parentId) : null,
                        startDate: startDate || null,
                        dueDate: dueDate || null,
                        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
                        doneRatio,
                        isPrivate,
                        notes: notes || undefined,
                        privateNotes,
                        customFields: customFieldsData,
                        spentTime: spentTime ? parseFloat(spentTime) : undefined,
                        activityId: activityId ? parseInt(activityId) : undefined,
                        timeComment: timeComment || undefined,
                    }
                );

                if (result.success) {
                    setError(null);
                    router.push(`${basePath}/issues/${issueId}`);
                } else {
                    setError(result.error || "Update failed");
                }
            } else {
                // Create new issue
                const result = await createIssueAction(project.identifier || "", {
                    projectId: project.id,
                    trackerId,
                    subject: subject.trim(),
                    description: description.trim(),
                    statusId,
                    priorityId,
                    assignedToId: assignedToId ? parseInt(assignedToId) : null,
                    categoryId: categoryId ? parseInt(categoryId) : null,
                    fixedVersionId: fixedVersionId ? parseInt(fixedVersionId) : null,
                    parentId: parentId ? parseInt(parentId) : null,
                    startDate: startDate || null,
                    dueDate: dueDate || null,
                    estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
                    doneRatio,
                    isPrivate,
                    customFields: customFieldsData,
                });

                if (result.success) {
                    setError(null);
                    if (andContinue) {
                        setSubject("");
                        setDescription("");
                    } else {
                        router.push(`${basePath}/issues/${result.issueId}`);
                    }
                } else {
                    setError(result.error || "Failed to create issue");
                }
            }
        });
    };

    // Parse possible values for list-type custom fields
    const parsePossibleValues = (pvStr: string | null): string[] => {
        if (!pvStr) return [];
        try {
            // YAML format: "---\n- value1\n- value2\n"
            return pvStr.split("\n").filter((l) => l.trim().startsWith("- ")).map((l) => l.trim().substring(2));
        } catch {
            return [];
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link>
                    <span className="mx-2">»</span>
                    <span>{editMode ? `Edit issue #${issueId}` : "New issue"}</span>
                </h1>
            </div>

            {/* Tabs */}
            <div className="border-b bg-gray-50 dark:bg-gray-800/50 px-4">
                <nav className="flex gap-0 overflow-x-auto">
                    {MODULE_TABS.filter(tab => tab.module === null || modules.includes(tab.module)).map((tab) => (
                        <Link key={tab.id} href={`${basePath}${tab.href}`}
                            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab.id === "issues" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}>
                            {tab.name}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Form */}
            <form onSubmit={(e) => handleSubmit(e)} className="px-6 py-6 max-w-4xl space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
                )}

                {/* ═══ Change properties fieldset ═══ */}
                <fieldset className="border border-gray-300 dark:border-gray-600 rounded px-4 pb-4 pt-2">
                    <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2">Change properties</legend>

                    {/* Private checkbox — top right */}
                    <div className="flex justify-end mb-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)}
                                className="rounded" />
                            Private
                        </label>
                    </div>

                    {/* Tracker */}
                    <div className="flex items-center gap-3 mb-3">
                        <label className="text-sm font-medium w-[110px] text-right shrink-0">Tracker <span className="text-red-500">*</span></label>
                        <select value={trackerId} onChange={(e) => setTrackerId(Number(e.target.value))}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-48">
                            {trackers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Subject */}
                    <div className="flex items-center gap-3 mb-3">
                        <label className="text-sm font-medium w-[110px] text-right shrink-0">Subject <span className="text-red-500">*</span></label>
                        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 flex-1"
                            placeholder="Issue subject" required />
                    </div>

                    {/* Description */}
                    <div className="flex items-start gap-3 mb-4">
                        <label className="text-sm font-medium w-[110px] text-right shrink-0 pt-1.5">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                            className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 flex-1 min-h-[120px]"
                            placeholder="Describe the issue..." />
                    </div>

                    {/* Properties grid — 4-column CSS grid: label-input-label-input */}
                    <div className="grid grid-cols-[minmax(110px,auto)_1fr_minmax(110px,auto)_1fr] gap-x-4 gap-y-2.5 items-center">
                        <label className="text-sm font-medium text-right">Status <span className="text-red-500">*</span></label>
                        <select value={statusId} onChange={(e) => setStatusId(Number(e.target.value))}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full">
                            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <label className="text-sm font-medium text-right">Parent task</label>
                        <input type="text" value={parentId} onChange={(e) => setParentId(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full"
                            placeholder="Issue #" />

                        <label className="text-sm font-medium text-right">Priority <span className="text-red-500">*</span></label>
                        <select value={priorityId} onChange={(e) => setPriorityId(Number(e.target.value))}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full">
                            {priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <label className="text-sm font-medium text-right">Start date</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full" />

                        <label className="text-sm font-medium text-right">Assignee</label>
                        <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full">
                            <option value="">-- Unassigned --</option>
                            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <label className="text-sm font-medium text-right">Due date</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full" />

                        <label className="text-sm font-medium text-right">Target version</label>
                        <select value={fixedVersionId} onChange={(e) => setFixedVersionId(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full">
                            <option value="">--</option>
                            {versions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <label className="text-sm font-medium text-right">Estimated time</label>
                        <div className="flex items-center gap-2">
                            <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)}
                                className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-20"
                                min="0" step="0.25" placeholder="0" />
                            <span className="text-sm text-gray-500">Hours</span>
                        </div>

                        <label className="text-sm font-medium text-right">Category</label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full">
                            <option value="">--</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <label className="text-sm font-medium text-right">% Done</label>
                        <select value={doneRatio} onChange={(e) => setDoneRatio(Number(e.target.value))}
                            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-full">
                            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                                <option key={v} value={v}>{v}%</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Fields */}
                    {customFields.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                            {customFields.map((cf) => {
                                const values = parsePossibleValues(cf.possibleValues);
                                return (
                                    <div key={cf.id} className="flex items-center gap-3">
                                        <label className="text-sm font-medium w-[110px] text-right shrink-0">
                                            {cf.name} {cf.isRequired && <span className="text-red-500">*</span>}
                                        </label>
                                        {cf.format === "bool" ? (
                                            <input type="checkbox" checked={cfValues[cf.id] === "1"}
                                                onChange={(e) => setCfValues({ ...cfValues, [cf.id]: e.target.checked ? "1" : "0" })}
                                                className="rounded" />
                                        ) : cf.format === "list" && values.length > 0 ? (
                                            <select value={cfValues[cf.id] || ""} onChange={(e) => setCfValues({ ...cfValues, [cf.id]: e.target.value })}
                                                className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 flex-1">
                                                <option value="">--</option>
                                                {values.map((v) => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        ) : cf.format === "text" ? (
                                            <textarea value={cfValues[cf.id] || ""} onChange={(e) => setCfValues({ ...cfValues, [cf.id]: e.target.value })}
                                                className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 flex-1 min-h-[60px]" />
                                        ) : cf.format === "date" ? (
                                            <input type="date" value={cfValues[cf.id] || ""} onChange={(e) => setCfValues({ ...cfValues, [cf.id]: e.target.value })}
                                                className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800" />
                                        ) : (
                                            <input type={cf.format === "int" || cf.format === "float" ? "number" : "text"}
                                                value={cfValues[cf.id] || ""} onChange={(e) => setCfValues({ ...cfValues, [cf.id]: e.target.value })}
                                                className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 flex-1" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </fieldset>

                {/* ═══ Log time section (edit mode only) ═══ */}
                {editMode && activities.length > 0 && (
                    <fieldset className="border border-gray-300 dark:border-gray-600 rounded px-4 pb-4 pt-2">
                        <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2">Log time</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium whitespace-nowrap">Spent time</label>
                                <input type="number" value={spentTime} onChange={(e) => setSpentTime(e.target.value)}
                                    className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-20"
                                    min="0" step="0.25" placeholder="" />
                                <span className="text-sm text-gray-500">Hours</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Activity</label>
                                <select value={activityId} onChange={(e) => setActivityId(e.target.value)}
                                    className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 flex-1">
                                    <option value="">--- Please select ---</option>
                                    {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <label className="text-sm font-medium">Comment</label>
                            <input type="text" value={timeComment} onChange={(e) => setTimeComment(e.target.value)}
                                className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 flex-1"
                                placeholder="" />
                        </div>
                    </fieldset>
                )}

                {/* ═══ Notes section (edit mode only) ═══ */}
                {editMode && (
                    <fieldset className="border border-gray-300 dark:border-gray-600 rounded px-4 pb-4 pt-2">
                        <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2">Notes</legend>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 min-h-[120px]"
                            placeholder="Add notes about this update..." />
                        <label className="flex items-center gap-2 text-sm mt-2">
                            <input type="checkbox" checked={privateNotes} onChange={(e) => setPrivateNotes(e.target.checked)}
                                className="rounded" />
                            Private notes
                        </label>
                    </fieldset>
                )}

                {/* ═══ Files section (edit mode only) ═══ */}
                {editMode && (
                    <fieldset className="border border-gray-300 dark:border-gray-600 rounded px-4 pb-4 pt-2">
                        <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-2">Files</legend>
                        {attachments.length > 0 && (
                            <div className="mb-3">
                                <p className="text-xs text-gray-500 mb-1">Current attachments:</p>
                                <ul className="space-y-1">
                                    {attachments.map((a) => (
                                        <li key={a.id} className="flex items-center gap-2 text-sm">
                                            <Link href={`/api/attachments/${a.id}`} className="text-blue-600 hover:underline">
                                                {a.filename}
                                            </Link>
                                            <span className="text-gray-400 text-xs">({formatFileSize(a.filesize)})</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input type="file" multiple
                                className="text-sm text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50" />
                            <span className="text-xs text-gray-400">(Maximum size: 20 MB)</span>
                        </div>
                    </fieldset>
                )}

                {/* Submit buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : editMode ? "Submit" : "Create"}
                    </Button>
                    {!editMode && (
                        <Button type="button" variant="outline" disabled={isPending}
                            onClick={(e) => handleSubmit(e as any, true)}>
                            Create and continue
                        </Button>
                    )}
                    <Link href={editMode ? `${basePath}/issues/${issueId}` : `${basePath}/issues`}>
                        <Button type="button" variant="ghost">Cancel</Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
