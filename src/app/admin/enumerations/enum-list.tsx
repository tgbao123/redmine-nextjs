"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createEnumerationAction, updateEnumerationAction } from "@/lib/admin/actions";

interface Enum { id: number; name: string; type: string; active: boolean; is_default: boolean; position: number }

const TYPE_LABELS: Record<string, string> = { IssuePriority: "Issue Priorities", TimeEntryActivity: "Activities (time tracking)", DocumentCategory: "Document Categories" };

export function EnumList({ enums }: { enums: Enum[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState("IssuePriority");

    const handleCreate = () => {
        startTransition(async () => {
            const r = await createEnumerationAction({ name, type, active: true, is_default: false });
            if (r.success) { setShowCreate(false); setName(""); router.refresh(); } else alert(r.error);
        });
    };

    const toggleDefault = (id: number) => {
        startTransition(async () => { await updateEnumerationAction(id, { is_default: true }); router.refresh(); });
    };

    const grouped = Object.entries(TYPE_LABELS).map(([key, label]) => ({ key, label, items: enums.filter(e => e.type === key) }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Enumerations</h1>
                <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ New"}</Button>
            </div>
            {showCreate && (
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 flex gap-3 items-end">
                    <div><label className="text-xs text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1.5 text-sm block" /></div>
                    <div><label className="text-xs text-gray-500">Type</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-2 py-1.5 text-sm block">
                            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <Button onClick={handleCreate} disabled={isPending}>Create</Button>
                </div>
            )}
            {grouped.map(g => (
                <div key={g.key}>
                    <h3 className="font-semibold text-sm text-gray-500 mb-2">{g.label}</h3>
                    <table className="w-full text-sm border rounded mb-4">
                        <thead className="bg-gray-100 dark:bg-gray-800"><tr><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Active</th><th className="text-left px-3 py-2">Default</th><th className="px-3 py-2">Actions</th></tr></thead>
                        <tbody>
                            {g.items.map(e => (
                                <tr key={e.id} className="border-t"><td className="px-3 py-2">{e.name}</td>
                                    <td className="px-3 py-2">{e.active ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                                    <td className="px-3 py-2">{e.is_default ? "★" : ""}</td>
                                    <td className="px-3 py-2 text-right">{!e.is_default && <Button variant="ghost" size="sm" onClick={() => toggleDefault(e.id)} disabled={isPending}>Set Default</Button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}
