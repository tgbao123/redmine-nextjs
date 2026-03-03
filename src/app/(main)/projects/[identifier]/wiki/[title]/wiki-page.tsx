"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { updateWikiPageAction, deleteWikiPageAction } from "@/lib/wiki/actions";

interface Props {
    project: { id: number; name: string; identifier: string | null };
    page: { id: number; title: string; createdOn: string };
    content: { text: string; version: number; updatedOn: string; author: string };
    permissions: string[];
}

export function WikiPage({ project, page, content, permissions }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(content.text);
    const [comment, setComment] = useState("");
    const basePath = `/projects/${project.identifier}`;
    const can = (p: string) => permissions.includes(p);

    const handleSave = () => {
        startTransition(async () => {
            const r = await updateWikiPageAction(project.id, project.identifier || "", page.id, { content: text, comment });
            if (r.success) { setEditing(false); setComment(""); router.refresh(); } else alert(r.error);
        });
    };

    const handleDelete = () => {
        if (!confirm(`Delete wiki page "${page.title}"?`)) return;
        startTransition(async () => {
            const r = await deleteWikiPageAction(project.id, project.identifier || "", page.id);
            if (r.success) router.push(`${basePath}/wiki`); else alert(r.error);
        });
    };

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/wiki`} className="hover:underline">Wiki</Link> » {page.title}
                </h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <div className="flex items-center gap-2">
                    {!editing && can("edit_wiki_pages") && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
                    {can("delete_wiki_pages") && <Button variant="ghost" size="sm" className="text-red-600" onClick={handleDelete} disabled={isPending}>Delete</Button>}
                    <Link href={`${basePath}/wiki/${encodeURIComponent(page.title)}/history`} className="text-sm text-primary hover:underline ml-auto">History (v{content.version})</Link>
                </div>

                {editing ? (
                    <div className="space-y-3">
                        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded p-3 text-sm min-h-[300px] font-mono" />
                        <input placeholder="Edit comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-full" />
                        <div className="flex gap-2">
                            <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
                            <Button variant="ghost" onClick={() => { setEditing(false); setText(content.text); }}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div className="wiki-content prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{content.text}</ReactMarkdown>
                    </div>
                )}

                <div className="text-xs text-muted-foreground border-t pt-2">
                    Updated by {content.author} on {new Date(content.updatedOn).toLocaleString()} (Version {content.version})
                </div>
            </div>
        </div>
    );
}
