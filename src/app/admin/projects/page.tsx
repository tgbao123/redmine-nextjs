import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminProjectsPage() {
    const user = await getSession();
    if (!user?.admin) redirect("/login");

    const projects = await prisma.projects.findMany({
        orderBy: [{ lft: "asc" }],
        select: { id: true, name: true, identifier: true, is_public: true, status: true, created_on: true, description: true },
    });

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">Projects</h1>
            </div>
            <div className="px-6 py-4">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500">{projects.length} project(s)</p>
                    <Link href="/projects/new" className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">+ New project</Link>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2 font-medium">Project</th>
                            <th className="text-left py-2 font-medium">Identifier</th>
                            <th className="text-left py-2 font-medium">Public</th>
                            <th className="text-left py-2 font-medium">Status</th>
                            <th className="text-left py-2 font-medium">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map(p => (
                            <tr key={p.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="py-2">
                                    <Link href={`/projects/${p.identifier}`} className="text-blue-600 hover:underline font-medium">{p.name}</Link>
                                </td>
                                <td className="py-2 text-gray-500">{p.identifier}</td>
                                <td className="py-2">{p.is_public ? "✓" : "✗"}</td>
                                <td className="py-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${p.status === 1 ? "bg-green-100 text-green-800" : p.status === 9 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>
                                        {p.status === 1 ? "active" : p.status === 9 ? "archived" : "closed"}
                                    </span>
                                </td>
                                <td className="py-2 text-gray-500">{p.created_on ? new Date(p.created_on).toLocaleDateString() : ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
