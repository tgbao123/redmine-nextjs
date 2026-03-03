"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCustomFieldAction } from "@/lib/admin/actions";

interface CF { id: number; name: string; type: string; field_format: string; is_required: boolean; is_filter: boolean; searchable: boolean; position: number }

const TYPE_LABELS: Record<string, string> = { IssueCustomField: "Issue", ProjectCustomField: "Project", UserCustomField: "User", TimeEntryCustomField: "Time", VersionCustomField: "Version" };
const FORMATS = ["string", "text", "int", "float", "date", "bool", "list", "link"];

export function CustomFieldList({ fields }: { fields: CF[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState("IssueCustomField");
    const [format, setFormat] = useState("string");
    const [required, setRequired] = useState(false);

    const handleCreate = () => {
        startTransition(async () => {
            const r = await createCustomFieldAction({ name, field_format: format, type, is_required: required });
            if (r.success) { setShowCreate(false); setName(""); router.refresh(); } else alert(r.error);
        });
    };

    const grouped = Object.entries(TYPE_LABELS).map(([key, label]) => ({
        label, fields: fields.filter(f => f.type === key),
    })).filter(g => g.fields.length > 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Custom Fields</h1>
                <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ New"}</Button>
            </div>
            {showCreate && (
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 flex gap-3 items-end flex-wrap">
                    <div><label className="text-xs text-gray-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1.5 text-sm block" /></div>
                    <div><label className="text-xs text-gray-500">Type</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-2 py-1.5 text-sm block">
                            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div><label className="text-xs text-gray-500">Format</label>
                        <select value={format} onChange={(e) => setFormat(e.target.value)} className="border rounded px-2 py-1.5 text-sm block">
                            {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label>
                    <Button onClick={handleCreate} disabled={isPending}>Create</Button>
                </div>
            )}
            {grouped.map(g => (
                <div key={g.label}>
                    <h3 className="font-semibold text-sm text-gray-500 mb-2">{g.label} Custom Fields</h3>
                    <table className="w-full text-sm border rounded mb-4">
                        <thead className="bg-gray-100 dark:bg-gray-800"><tr><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Format</th><th className="text-left px-3 py-2">Required</th><th className="text-left px-3 py-2">Filter</th></tr></thead>
                        <tbody>
                            {g.fields.map(f => (
                                <tr key={f.id} className="border-t"><td className="px-3 py-2">{f.name}</td><td className="px-3 py-2">{f.field_format}</td>
                                    <td className="px-3 py-2">{f.is_required ? "✓" : ""}</td><td className="px-3 py-2">{f.is_filter ? "✓" : ""}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}
