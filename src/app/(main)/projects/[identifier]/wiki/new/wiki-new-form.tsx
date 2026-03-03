"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createWikiPageAction } from "@/lib/wiki/actions";

interface Props { project: { id: number; name: string; identifier: string | null } }

export function WikiNewForm({ project }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    const basePath = `/projects/${project.identifier}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Title is required"); return; }
        startTransition(async () => {
            const r = await createWikiPageAction(project.id, project.identifier || "", { title: title.trim(), content });
            if (r.success) router.push(`${basePath}/wiki/${encodeURIComponent(title.trim())}`);
            else setError(r.error || "Failed");
        });
    };

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/wiki`} className="hover:underline">Wiki</Link> » New Page</h1>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-w-3xl">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>}
                <div><label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-full mt-1" required /></div>
                <div><label className="text-sm font-medium">Content</label>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} className="border rounded p-3 text-sm w-full min-h-[300px] font-mono mt-1" /></div>
                <div className="flex gap-2"><Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
                    <Link href={`${basePath}/wiki`}><Button type="button" variant="ghost">Cancel</Button></Link></div>
            </form>
        </div>
    );
}
