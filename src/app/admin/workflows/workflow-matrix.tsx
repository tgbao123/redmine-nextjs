"use client";
import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getWorkflowsAction, updateWorkflowsAction } from "@/lib/admin/actions";

interface NamedEntity { id: number; name: string }

export function WorkflowMatrix({ roles, trackers, statuses }: { roles: NamedEntity[]; trackers: NamedEntity[]; statuses: NamedEntity[] }) {
    const [isPending, startTransition] = useTransition();
    const [roleId, setRoleId] = useState(roles[0]?.id || 0);
    const [trackerId, setTrackerId] = useState(trackers[0]?.id || 0);
    const [transitions, setTransitions] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (roleId && trackerId) {
            setLoaded(false);
            startTransition(async () => {
                const wfs = await getWorkflowsAction(roleId, trackerId);
                setTransitions(new Set(wfs.map((w) => `${w.old_status_id}-${w.new_status_id}`)));
                setLoaded(true);
            });
        }
    }, [roleId, trackerId]);

    const toggle = (from: number, to: number) => {
        const key = `${from}-${to}`;
        const next = new Set(transitions);
        if (next.has(key)) next.delete(key); else next.add(key);
        setTransitions(next);
    };

    const save = () => {
        const data = Array.from(transitions).map((k) => { const [f, t] = k.split("-"); return { from: parseInt(f), to: parseInt(t) }; });
        startTransition(async () => {
            await updateWorkflowsAction(roleId, trackerId, data);
        });
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Workflow Transitions</h1>
            <div className="flex gap-4 items-end">
                <div>
                    <label className="text-xs text-gray-500">Role</label>
                    <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} className="border rounded px-2 py-1.5 text-sm block">
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Tracker</label>
                    <select value={trackerId} onChange={(e) => setTrackerId(Number(e.target.value))} className="border rounded px-2 py-1.5 text-sm block">
                        {trackers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <Button onClick={save} disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
            </div>

            {loaded && (
                <div className="border rounded overflow-x-auto bg-white dark:bg-gray-900">
                    <table className="text-xs">
                        <thead>
                            <tr><th className="px-2 py-1 border text-left">From ↓ / To →</th>
                                {statuses.map(s => <th key={s.id} className="px-2 py-1 border text-center whitespace-nowrap" style={{ writingMode: "vertical-lr" }}>{s.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {statuses.map(from => (
                                <tr key={from.id}>
                                    <td className="px-2 py-1 border font-medium whitespace-nowrap">{from.name}</td>
                                    {statuses.map(to => (
                                        <td key={to.id} className="px-1 py-1 border text-center">
                                            {from.id === to.id ? <span className="text-gray-300">—</span> : (
                                                <input type="checkbox" checked={transitions.has(`${from.id}-${to.id}`)} onChange={() => toggle(from.id, to.id)}
                                                    className="w-3.5 h-3.5 cursor-pointer" />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
