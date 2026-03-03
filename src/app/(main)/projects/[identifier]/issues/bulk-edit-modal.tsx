"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { bulkUpdateAction, bulkDeleteAction } from "@/lib/issues/bulk-actions";

interface Props {
    issueIds: number[];
    projectId: number;
    projectIdentifier: string;
    statuses: { id: number; name: string }[];
    trackers: { id: number; name: string }[];
    priorities: { id: number; name: string }[];
    members: { id: number; name: string }[];
    versions: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    onClose: () => void;
}

export function BulkEditModal({
    issueIds, projectId, projectIdentifier,
    statuses, trackers, priorities, members, versions, categories,
    onClose,
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [statusId, setStatusId] = useState("");
    const [trackerId, setTrackerId] = useState("");
    const [priorityId, setPriorityId] = useState("");
    const [assigneeId, setAssigneeId] = useState("");
    const [versionId, setVersionId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [doneRatio, setDoneRatio] = useState("");

    const handleUpdate = () => {
        const updates: Record<string, unknown> = {};
        if (statusId) updates.statusId = parseInt(statusId);
        if (trackerId) updates.trackerId = parseInt(trackerId);
        if (priorityId) updates.priorityId = parseInt(priorityId);
        if (assigneeId === "none") updates.assignedToId = null;
        else if (assigneeId) updates.assignedToId = parseInt(assigneeId);
        if (versionId === "none") updates.versionId = null;
        else if (versionId) updates.versionId = parseInt(versionId);
        if (categoryId === "none") updates.categoryId = null;
        else if (categoryId) updates.categoryId = parseInt(categoryId);
        if (doneRatio) updates.doneRatio = parseInt(doneRatio);

        if (Object.keys(updates).length === 0) { alert("Select at least one field to update"); return; }

        startTransition(async () => {
            const result = await bulkUpdateAction(issueIds, updates);
            if (result.success) { onClose(); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleDelete = () => {
        if (!confirm(`Delete ${issueIds.length} issues? This cannot be undone.`)) return;
        startTransition(async () => {
            const result = await bulkDeleteAction(issueIds);
            if (result.success) { onClose(); router.refresh(); }
            else alert(result.error);
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Bulk edit ({issueIds.length} issues)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <p className="text-sm text-gray-500">Leave fields blank to keep current values.</p>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500">Status</label>
                        <select value={statusId} onChange={e => setStatusId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                            <option value="">-- No change --</option>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Tracker</label>
                        <select value={trackerId} onChange={e => setTrackerId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                            <option value="">-- No change --</option>
                            {trackers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Priority</label>
                        <select value={priorityId} onChange={e => setPriorityId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                            <option value="">-- No change --</option>
                            {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Assignee</label>
                        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                            <option value="">-- No change --</option>
                            <option value="none">Nobody</option>
                            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Version</label>
                        <select value={versionId} onChange={e => setVersionId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                            <option value="">-- No change --</option>
                            <option value="none">None</option>
                            {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">Category</label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                            <option value="">-- No change --</option>
                            <option value="none">None</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500">% Done</label>
                        <select value={doneRatio} onChange={e => setDoneRatio(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                            <option value="">-- No change --</option>
                            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => <option key={v} value={v}>{v}%</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-between pt-2">
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>Delete selected</Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={isPending}>{isPending ? "Updating..." : "Apply"}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
