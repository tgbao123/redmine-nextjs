"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createGroupAction, deleteGroupAction, addUserToGroupAction, removeUserFromGroupAction } from "@/lib/admin/group-actions";

interface Props {
    groups: { id: number; name: string; memberCount: number; createdOn: string }[];
    allUsers: { id: number; name: string }[];
}

export function GroupEditor({ groups, allUsers }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

    const handleCreate = () => {
        if (!newGroupName.trim()) return;
        startTransition(async () => {
            const result = await createGroupAction(newGroupName);
            if (result.success) { setNewGroupName(""); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleDelete = (groupId: number) => {
        if (!confirm("Delete this group?")) return;
        startTransition(async () => {
            const result = await deleteGroupAction(groupId);
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    const handleAddUser = (groupId: number, userId: number) => {
        startTransition(async () => {
            const result = await addUserToGroupAction(groupId, userId);
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    return (
        <div className="space-y-6">
            {/* Create new group */}
            <div className="flex items-center gap-3">
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-60" placeholder="New group name" />
                <Button onClick={handleCreate} disabled={isPending} size="sm">Create</Button>
            </div>

            {/* Groups list */}
            <table className="w-full text-sm">
                <thead><tr className="border-b">
                    <th className="text-left py-2 font-medium">Group</th>
                    <th className="text-left py-2 font-medium">Members</th>
                    <th className="text-left py-2 font-medium">Created</th>
                    <th className="text-right py-2 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                    {groups.map(g => (
                        <tr key={g.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 font-medium">{g.name}</td>
                            <td className="py-2 text-gray-500">{g.memberCount}</td>
                            <td className="py-2 text-gray-500">{g.createdOn ? new Date(g.createdOn).toLocaleDateString() : ""}</td>
                            <td className="py-2 text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}>
                                        {selectedGroup === g.id ? "Close" : "Members"}
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(g.id)} disabled={isPending}>Delete</Button>
                                </div>
                                {selectedGroup === g.id && (
                                    <div className="mt-2 text-left">
                                        <select onChange={e => { if (e.target.value) handleAddUser(g.id, parseInt(e.target.value)); e.target.value = ""; }}
                                            className="border rounded px-2 py-1 text-xs w-full" disabled={isPending}>
                                            <option value="">+ Add user...</option>
                                            {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
