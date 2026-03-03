"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createStatusAction, deleteStatusAction } from "@/lib/admin/actions";

interface Status { id: number; name: string; is_closed: boolean; position: number; default_done_ratio: number | null }

export function StatusList({ statuses }: { statuses: Status[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [isClosed, setIsClosed] = useState(false);

    const handleCreate = () => {
        startTransition(async () => {
            const r = await createStatusAction({ name, is_closed: isClosed });
            if (r.success) { setShowCreate(false); setName(""); setIsClosed(false); router.refresh(); } else alert(r.error);
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm("Delete this status?")) return;
        startTransition(async () => { const r = await deleteStatusAction(id); if (!r.success) alert(r.error); router.refresh(); });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Issue Statuses</h1>
                <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ New Status"}</Button>
            </div>
            {showCreate && (
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 flex gap-3 items-end">
                    <div><label className="text-xs text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1.5 text-sm block" /></div>
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} /> Closed</label>
                    <Button onClick={handleCreate} disabled={isPending}>Create</Button>
                </div>
            )}
            <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100 dark:bg-gray-800"><tr><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Closed?</th><th className="text-left px-3 py-2">Position</th><th className="px-3 py-2">Actions</th></tr></thead>
                <tbody>
                    {statuses.map(s => (
                        <tr key={s.id} className="border-t"><td className="px-3 py-2">{s.name}</td>
                            <td className="px-3 py-2">{s.is_closed ? <span className="text-red-600">✓ Closed</span> : <span className="text-green-600">Open</span>}</td>
                            <td className="px-3 py-2 text-gray-500">{s.position}</td>
                            <td className="px-3 py-2 text-right"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(s.id)} disabled={isPending}>Delete</Button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
