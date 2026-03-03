"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createNewsAction } from "@/lib/news/actions";

interface Props { project: { id: number; name: string; identifier: string | null } }

export default function NewNewsForm({ project }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const basePath = `/projects/${project.identifier}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Title is required"); return; }
        startTransition(async () => {
            const r = await createNewsAction(project.id, project.identifier || "", { title: title.trim(), summary, description });
            if (r.success && r.newsId) router.push(`${basePath}/news/${r.newsId}`);
            else setError(r.error || "Failed");
        });
    };

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/news`} className="hover:underline">News</Link> » New</h1>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-w-3xl">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>}
                <div><label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-full mt-1" required /></div>
                <div><label className="text-sm font-medium">Summary</label>
                    <input value={summary} onChange={(e) => setSummary(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-full mt-1" /></div>
                <div><label className="text-sm font-medium">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="border rounded p-3 text-sm w-full min-h-[200px] mt-1" /></div>
                <div className="flex gap-2"><Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
                    <Link href={`${basePath}/news`}><Button type="button" variant="ghost">Cancel</Button></Link></div>
            </form>
        </div>
    );
}
