"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    updateProjectAction, deleteProjectAction, archiveProjectAction,
    addMemberAction, removeMemberAction, updateMemberRolesAction,
    createVersionAction, updateVersionAction, deleteVersionAction,
    createCategoryAction, updateCategoryAction, deleteCategoryAction,
} from "@/lib/projects/settings-actions";

interface Props {
    project: { id: number; name: string; identifier: string; description: string; homepage: string; isPublic: boolean; inheritMembers: boolean };
    trackers: { id: number; name: string }[];
    selectedTrackerIds: number[];
    allModules: string[];
    enabledModules: string[];
    members: { id: number; userId: number; user: { id: number; name: string; login: string }; roles: number[]; createdOn: string }[];
    roles: { id: number; name: string }[];
    allUsers: { id: number; name: string }[];
    versions: { id: number; name: string; description: string; status: string; effectiveDate: string; sharing: string; wikiPageTitle: string }[];
    categories: { id: number; name: string; assignedToId: number | null }[];
    isAdmin: boolean;
}

const TABS = ["General", "Modules", "Members", "Versions", "Categories"];

export function SettingsTabs(props: Props) {
    const { project } = props;
    const [activeTab, setActiveTab] = useState("General");
    const basePath = `/projects/${project.identifier}`;

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » Settings
                </h1>
            </div>

            {/* Settings tabs */}
            <div className="border-b bg-white dark:bg-gray-900">
                <nav className="flex gap-0 px-6">
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="px-6 py-6 max-w-4xl">
                {activeTab === "General" && <GeneralTab {...props} />}
                {activeTab === "Modules" && <ModulesTab {...props} />}
                {activeTab === "Members" && <MembersTab {...props} />}
                {activeTab === "Versions" && <VersionsTab {...props} />}
                {activeTab === "Categories" && <CategoriesTab {...props} />}
            </div>
        </div>
    );
}

// ─── General Tab ───

function GeneralTab({ project, trackers, selectedTrackerIds, isAdmin }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description);
    const [homepage, setHomepage] = useState(project.homepage);
    const [isPublic, setIsPublic] = useState(project.isPublic);
    const [inheritMembers, setInheritMembers] = useState(project.inheritMembers);
    const [trackerIds, setTrackerIds] = useState<number[]>(selectedTrackerIds);

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateProjectAction(project.id, {
                name, description, homepage, isPublic, inheritMembers, trackerIds,
            });
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    const handleDelete = () => {
        if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
        startTransition(async () => {
            const result = await deleteProjectAction(project.id);
            if (result.success) router.push("/projects");
            else alert(result.error);
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
                <label className="text-sm font-medium text-right pt-2">Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-full" />

                <label className="text-sm font-medium text-right pt-2">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="border rounded px-3 py-2 text-sm w-full min-h-[100px]" />

                <label className="text-sm font-medium text-right pt-2">Homepage</label>
                <input type="text" value={homepage} onChange={e => setHomepage(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-full" />

                <label className="text-sm font-medium text-right pt-2">Public</label>
                <label className="flex items-center gap-2 pt-2">
                    <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-600">Project is public</span>
                </label>

                <label className="text-sm font-medium text-right pt-2">Inherit members</label>
                <label className="flex items-center gap-2 pt-2">
                    <input type="checkbox" checked={inheritMembers} onChange={e => setInheritMembers(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-600">Inherit from parent</span>
                </label>

                <label className="text-sm font-medium text-right pt-2">Trackers</label>
                <div className="flex flex-wrap gap-3 pt-1">
                    {trackers.map(t => (
                        <label key={t.id} className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" checked={trackerIds.includes(t.id)}
                                onChange={e => setTrackerIds(e.target.checked ? [...trackerIds, t.id] : trackerIds.filter(id => id !== t.id))}
                                className="rounded" />
                            {t.name}
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
                {isAdmin && <Button variant="destructive" onClick={handleDelete} disabled={isPending}>Delete project</Button>}
            </div>
        </div>
    );
}

// ─── Modules Tab ───

function ModulesTab({ project, allModules, enabledModules: initialModules }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [modules, setModules] = useState<string[]>(initialModules);

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateProjectAction(project.id, { moduleNames: modules });
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                {allModules.map(mod => (
                    <label key={mod} className="flex items-center gap-2 text-sm py-1">
                        <input type="checkbox" checked={modules.includes(mod)}
                            onChange={e => setModules(e.target.checked ? [...modules, mod] : modules.filter(m => m !== mod))}
                            className="rounded" />
                        {mod.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </label>
                ))}
            </div>
            <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
        </div>
    );
}

// ─── Members Tab ───

function MembersTab({ project, members, roles, allUsers }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [newUserId, setNewUserId] = useState("");
    const [newRoleIds, setNewRoleIds] = useState<number[]>([]);

    const existingUserIds = new Set(members.map(m => m.userId));
    const availableUsers = allUsers.filter(u => !existingUserIds.has(u.id));

    const handleAdd = () => {
        if (!newUserId || newRoleIds.length === 0) { alert("Select a user and at least one role"); return; }
        startTransition(async () => {
            const result = await addMemberAction(project.id, parseInt(newUserId), newRoleIds);
            if (result.success) { setNewUserId(""); setNewRoleIds([]); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleRemove = (memberId: number) => {
        if (!confirm("Remove this member?")) return;
        startTransition(async () => {
            const result = await removeMemberAction(project.id, memberId);
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    return (
        <div className="space-y-6">
            {/* Add member form */}
            <fieldset className="border rounded p-4 space-y-3">
                <legend className="text-sm font-semibold px-2">New member</legend>
                <div className="flex items-center gap-3">
                    <select value={newUserId} onChange={e => setNewUserId(e.target.value)} className="border rounded px-3 py-1.5 text-sm flex-1">
                        <option value="">-- Select user --</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2">
                        {roles.map(r => (
                            <label key={r.id} className="flex items-center gap-1 text-sm">
                                <input type="checkbox" checked={newRoleIds.includes(r.id)}
                                    onChange={e => setNewRoleIds(e.target.checked ? [...newRoleIds, r.id] : newRoleIds.filter(id => id !== r.id))}
                                    className="rounded" />
                                {r.name}
                            </label>
                        ))}
                    </div>
                    <Button size="sm" onClick={handleAdd} disabled={isPending}>Add</Button>
                </div>
            </fieldset>

            {/* Members list */}
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2 font-medium">User</th>
                        <th className="text-left py-2 font-medium">Roles</th>
                        <th className="text-right py-2 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map(m => (
                        <MemberRow key={m.id} member={m} roles={roles} projectId={project.id} onRemove={() => handleRemove(m.id)} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MemberRow({ member, roles, projectId, onRemove }: {
    member: Props["members"][0]; roles: { id: number; name: string }[]; projectId: number; onRemove: () => void;
}) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [roleIds, setRoleIds] = useState<number[]>(member.roles);
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateMemberRolesAction(member.id, roleIds);
            if (result.success) { setEditing(false); router.refresh(); }
            else alert(result.error);
        });
    };

    return (
        <tr className="border-b">
            <td className="py-2">{member.user.name}</td>
            <td className="py-2">
                {editing ? (
                    <div className="flex flex-wrap gap-2">
                        {roles.map(r => (
                            <label key={r.id} className="flex items-center gap-1 text-xs">
                                <input type="checkbox" checked={roleIds.includes(r.id)}
                                    onChange={e => setRoleIds(e.target.checked ? [...roleIds, r.id] : roleIds.filter(id => id !== r.id))}
                                    className="rounded" />
                                {r.name}
                            </label>
                        ))}
                    </div>
                ) : (
                    <span>{member.roles.map(rid => roles.find(r => r.id === rid)?.name).filter(Boolean).join(", ")}</span>
                )}
            </td>
            <td className="py-2 text-right">
                {editing ? (
                    <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setRoleIds(member.roles); }}>Cancel</Button>
                    </div>
                ) : (
                    <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={onRemove}>Remove</Button>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ─── Versions Tab ───

function VersionsTab({ project, versions }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDate, setNewDate] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const handleCreate = () => {
        if (!newName.trim()) return;
        startTransition(async () => {
            const result = await createVersionAction(project.id, { name: newName, description: newDesc, effectiveDate: newDate });
            if (result.success) { setNewName(""); setNewDate(""); setNewDesc(""); setShowForm(false); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleDelete = (versionId: number) => {
        if (!confirm("Delete this version? Issues will be unlinked.")) return;
        startTransition(async () => {
            const result = await deleteVersionAction(versionId);
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    const handleClose = (versionId: number, status: string) => {
        startTransition(async () => {
            const result = await updateVersionAction(versionId, { status });
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    return (
        <div className="space-y-4">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2 font-medium">Version</th>
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-left py-2 font-medium">Description</th>
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-right py-2 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {versions.map(v => (
                        <tr key={v.id} className="border-b">
                            <td className="py-2 font-medium">{v.name}</td>
                            <td className="py-2 text-gray-500">{v.effectiveDate || "-"}</td>
                            <td className="py-2 text-gray-500 max-w-[200px] truncate">{v.description || "-"}</td>
                            <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${v.status === "open" ? "bg-green-100 text-green-800" : v.status === "locked" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>
                                    {v.status}
                                </span>
                            </td>
                            <td className="py-2 text-right space-x-1">
                                {v.status === "open" && <Button size="sm" variant="ghost" onClick={() => handleClose(v.id, "closed")}>Close</Button>}
                                {v.status === "closed" && <Button size="sm" variant="ghost" onClick={() => handleClose(v.id, "open")}>Reopen</Button>}
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(v.id)} disabled={isPending}>Delete</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showForm ? (
                <fieldset className="border rounded p-4 space-y-3">
                    <legend className="text-sm font-semibold px-2">New version</legend>
                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                        <label className="text-sm text-right">Name *</label>
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                        <label className="text-sm text-right">Date</label>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-48" />
                        <label className="text-sm text-right">Description</label>
                        <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreate} disabled={isPending}>Create</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                    </div>
                </fieldset>
            ) : (
                <Button variant="outline" onClick={() => setShowForm(true)}>+ New version</Button>
            )}
        </div>
    );
}

// ─── Categories Tab ───

function CategoriesTab({ project, categories, allUsers }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newAssignee, setNewAssignee] = useState("");

    const handleCreate = () => {
        if (!newName.trim()) return;
        startTransition(async () => {
            const result = await createCategoryAction(project.id, {
                name: newName, assignedToId: newAssignee ? parseInt(newAssignee) : undefined,
            });
            if (result.success) { setNewName(""); setNewAssignee(""); setShowForm(false); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleDelete = (categoryId: number) => {
        if (!confirm("Delete this category?")) return;
        startTransition(async () => {
            const result = await deleteCategoryAction(categoryId);
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    return (
        <div className="space-y-4">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2 font-medium">Category</th>
                        <th className="text-left py-2 font-medium">Assigned to</th>
                        <th className="text-right py-2 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map(c => (
                        <tr key={c.id} className="border-b">
                            <td className="py-2">{c.name}</td>
                            <td className="py-2 text-gray-500">{c.assignedToId ? allUsers.find(u => u.id === c.assignedToId)?.name || "-" : "-"}</td>
                            <td className="py-2 text-right">
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(c.id)} disabled={isPending}>Delete</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showForm ? (
                <fieldset className="border rounded p-4 space-y-3">
                    <legend className="text-sm font-semibold px-2">New category</legend>
                    <div className="flex items-center gap-3">
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Category name" className="border rounded px-3 py-1.5 text-sm flex-1" />
                        <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
                            <option value="">-- Assigned to --</option>
                            {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <Button size="sm" onClick={handleCreate} disabled={isPending}>Create</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                    </div>
                </fieldset>
            ) : (
                <Button variant="outline" onClick={() => setShowForm(true)}>+ New category</Button>
            )}
        </div>
    );
}
