"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createTrackerAction, updateTrackerAction, deleteTrackerAction } from "@/lib/admin/actions";

interface Tracker { id: number; name: string; default_status_id: number; is_in_roadmap: boolean; position: number }
interface Status { id: number; name: string }

export function TrackerList({ trackers, statuses }: { trackers: Tracker[]; statuses: Status[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [defaultStatusId, setDefaultStatusId] = useState(statuses[0]?.id || 1);
    const [isInRoadmap, setIsInRoadmap] = useState(true);

    const handleCreate = () => {
        startTransition(async () => {
            const r = await createTrackerAction({ name, default_status_id: defaultStatusId, is_in_roadmap: isInRoadmap });
            if (r.success) { setShowCreate(false); setName(""); router.refresh(); } else alert(r.error);
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm("Delete this tracker?")) return;
        startTransition(async () => { const r = await deleteTrackerAction(id); if (!r.success) alert(r.error); router.refresh(); });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Trackers</h1>
                <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ New Tracker"}</Button>
            </div>
            {showCreate && (
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 flex gap-3 items-end">
                    <div><label className="text-xs text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1.5 text-sm block" /></div>
                    <div><label className="text-xs text-gray-500">Default Status</label>
                        <select value={defaultStatusId} onChange={(e) => setDefaultStatusId(Number(e.target.value))} className="border rounded px-2 py-1.5 text-sm block">
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={isInRoadmap} onChange={(e) => setIsInRoadmap(e.target.checked)} /> Roadmap</label>
                    <Button onClick={handleCreate} disabled={isPending}>Create</Button>
                </div>
            )}
            <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100 dark:bg-gray-800"><tr><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Default Status</th><th className="text-left px-3 py-2">Roadmap</th><th className="px-3 py-2">Actions</th></tr></thead>
                <tbody>
                    {trackers.map(t => (
                        <tr key={t.id} className="border-t"><td className="px-3 py-2">{t.name}</td>
                            <td className="px-3 py-2">{statuses.find(s => s.id === t.default_status_id)?.name || t.default_status_id}</td>
                            <td className="px-3 py-2">{t.is_in_roadmap ? "✓" : ""}</td>
                            <td className="px-3 py-2 text-right"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(t.id)} disabled={isPending}>Delete</Button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
