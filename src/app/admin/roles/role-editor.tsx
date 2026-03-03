"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Permission } from "@/lib/permissions/constants";
import { updateRoleAction, createRoleAction, deleteRoleAction } from "@/lib/admin/actions";

interface Role { id: number; name: string; builtin: number; assignable: boolean; permissions: string[]; position: number }

const PERM_GROUPS: Record<string, string[]> = {
    "Project": [Permission.MANAGE_MEMBERS, Permission.MANAGE_VERSIONS, Permission.MANAGE_CATEGORIES, Permission.MANAGE_REPOSITORY, Permission.MANAGE_BOARDS, Permission.ADD_PROJECT, Permission.EDIT_PROJECT, Permission.CLOSE_PROJECT, Permission.SELECT_PROJECT_MODULES, Permission.MANAGE_WIKI],
    "Issues": [Permission.VIEW_ISSUES, Permission.ADD_ISSUES, Permission.EDIT_ISSUES, Permission.DELETE_ISSUES, Permission.MANAGE_ISSUE_RELATIONS, Permission.MANAGE_SUBTASKS, Permission.SET_ISSUES_PRIVATE, Permission.SET_OWN_ISSUES_PRIVATE, Permission.ADD_ISSUE_NOTES, Permission.EDIT_ISSUE_NOTES, Permission.EDIT_OWN_ISSUE_NOTES, Permission.VIEW_PRIVATE_NOTES, Permission.SET_NOTES_PRIVATE, Permission.DELETE_ISSUE_WATCHERS],
    "Time": [Permission.LOG_TIME, Permission.VIEW_TIME_ENTRIES, Permission.EDIT_TIME_ENTRIES, Permission.EDIT_OWN_TIME_ENTRIES, Permission.MANAGE_PROJECT_ACTIVITIES],
    "Wiki": [Permission.VIEW_WIKI_PAGES, Permission.EDIT_WIKI_PAGES, Permission.DELETE_WIKI_PAGES, Permission.VIEW_WIKI_EDITS, Permission.PROTECT_WIKI_PAGES, Permission.MANAGE_WIKI],
    "Content": [Permission.VIEW_NEWS, Permission.MANAGE_NEWS, Permission.COMMENT_NEWS, Permission.VIEW_DOCUMENTS, Permission.ADD_DOCUMENTS, Permission.EDIT_DOCUMENTS, Permission.DELETE_DOCUMENTS, Permission.VIEW_FILES, Permission.MANAGE_FILES],
    "Forum": [Permission.VIEW_MESSAGES, Permission.ADD_MESSAGES, Permission.EDIT_MESSAGES, Permission.EDIT_OWN_MESSAGES, Permission.DELETE_MESSAGES, Permission.DELETE_OWN_MESSAGES],
};

export function RoleEditor({ roles }: { roles: Role[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editPerms, setEditPerms] = useState<Set<string>>(new Set());
    const [newName, setNewName] = useState("");

    const selectRole = (role: Role) => {
        setSelectedRole(role);
        setEditPerms(new Set(role.permissions));
    };

    const togglePerm = (perm: string) => {
        const next = new Set(editPerms);
        if (next.has(perm)) next.delete(perm); else next.add(perm);
        setEditPerms(next);
    };

    const savePerms = () => {
        if (!selectedRole) return;
        const yaml = "---\n" + Array.from(editPerms).map((p) => `- :${p}`).join("\n") + "\n";
        startTransition(async () => {
            await updateRoleAction(selectedRole.id, { permissions: yaml });
            router.refresh();
        });
    };

    const handleCreate = () => {
        if (!newName) return;
        startTransition(async () => {
            await createRoleAction({ name: newName, permissions: "---\n" });
            setNewName("");
            router.refresh();
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm("Delete this role?")) return;
        startTransition(async () => { await deleteRoleAction(id); router.refresh(); });
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Role list */}
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-2">
                    <h3 className="font-semibold text-sm">Roles</h3>
                    {roles.map((r) => (
                        <div key={r.id} className={`flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer ${selectedRole?.id === r.id ? "bg-blue-100 dark:bg-blue-900 text-blue-700" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`} onClick={() => selectRole(r)}>
                            <span>{r.name} {r.builtin !== 0 && <span className="text-xs text-gray-400">(builtin)</span>}</span>
                            {r.builtin === 0 && (
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            )}
                        </div>
                    ))}
                    <div className="flex gap-1 pt-2 border-t">
                        <input placeholder="New role" value={newName} onChange={(e) => setNewName(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
                        <Button size="sm" onClick={handleCreate} disabled={isPending}>Add</Button>
                    </div>
                </div>

                {/* Permission matrix */}
                <div className="lg:col-span-3 border rounded-lg p-4 bg-white dark:bg-gray-900">
                    {selectedRole ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Permissions for: {selectedRole.name}</h3>
                                <Button onClick={savePerms} disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
                            </div>
                            {Object.entries(PERM_GROUPS).map(([group, perms]) => (
                                <div key={group}>
                                    <h4 className="font-medium text-sm text-gray-500 mb-1">{group}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                                        {perms.map((p) => (
                                            <label key={p} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                                <input type="checkbox" checked={editPerms.has(p)} onChange={() => togglePerm(p)} className="rounded" />
                                                {p.replace(/_/g, " ")}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-12">Select a role to edit permissions</div>
                    )}
                </div>
            </div>
        </div>
    );
}
