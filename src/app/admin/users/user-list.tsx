"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createUserAction, lockUserAction } from "@/lib/admin/actions";

interface User {
    id: number; login: string; firstname: string; lastname: string;
    mail: string | null; admin: boolean; status: number;
    last_login_on: Date | null; created_on: Date | null;
}

const STATUS_LABELS: Record<number, string> = { 1: "Active", 2: "Registered", 3: "Locked" };
const STATUS_COLORS: Record<number, string> = { 1: "text-green-600", 2: "text-yellow-600", 3: "text-red-600" };

export function UserList({ users }: { users: User[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState("all");
    const [nameFilter, setNameFilter] = useState("");

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [mail, setMail] = useState("");
    const [admin, setAdmin] = useState(false);

    const filtered = users.filter((u) => {
        if (filter !== "all" && u.status !== parseInt(filter)) return false;
        if (nameFilter && !`${u.login} ${u.firstname} ${u.lastname}`.toLowerCase().includes(nameFilter.toLowerCase())) return false;
        return true;
    });

    const handleCreate = () => {
        startTransition(async () => {
            const result = await createUserAction({ login, password, firstname, lastname, mail, admin, language: "en" });
            if (result.success) { setShowCreate(false); setLogin(""); setPassword(""); setFirstname(""); setLastname(""); setMail(""); setAdmin(false); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleLock = (userId: number, lock: boolean) => {
        startTransition(async () => {
            await lockUserAction(userId, lock);
            router.refresh();
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Users ({filtered.length})</h1>
                <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ New User"}</Button>
            </div>

            {showCreate && (
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
                    <h3 className="font-semibold">Create User</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Login *" value={login} onChange={(e) => setLogin(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                        <input placeholder="Password *" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                        <input placeholder="First name *" value={firstname} onChange={(e) => setFirstname(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                        <input placeholder="Last name *" value={lastname} onChange={(e) => setLastname(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                        <input placeholder="Email" value={mail} onChange={(e) => setMail(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} /> Administrator</label>
                    </div>
                    <Button onClick={handleCreate} disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
                </div>
            )}

            <div className="flex gap-3">
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
                    <option value="all">All</option>
                    <option value="1">Active</option>
                    <option value="2">Registered</option>
                    <option value="3">Locked</option>
                </select>
                <input placeholder="Filter by name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
            </div>

            <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                        <th className="text-left px-3 py-2">Login</th>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Email</th>
                        <th className="text-left px-3 py-2">Admin</th>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="text-left px-3 py-2">Last login</th>
                        <th className="text-left px-3 py-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map((u) => (
                        <tr key={u.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="px-3 py-2 font-medium">{u.login}</td>
                            <td className="px-3 py-2">{u.firstname} {u.lastname}</td>
                            <td className="px-3 py-2">{u.mail}</td>
                            <td className="px-3 py-2">{u.admin ? "✓" : ""}</td>
                            <td className={`px-3 py-2 ${STATUS_COLORS[u.status] || ""}`}>{STATUS_LABELS[u.status] || u.status}</td>
                            <td className="px-3 py-2 text-gray-500">{u.last_login_on ? new Date(u.last_login_on).toLocaleDateString() : "Never"}</td>
                            <td className="px-3 py-2">
                                <Button variant="ghost" size="sm" onClick={() => handleLock(u.id, u.status !== 3)} disabled={isPending}>
                                    {u.status === 3 ? "Unlock" : "Lock"}
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
