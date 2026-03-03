"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateNewsAction, deleteNewsAction, addCommentAction, deleteCommentAction } from "@/lib/news/actions";
import ReactMarkdown from "react-markdown";

interface Props {
    projectId: number;
    projectIdentifier: string;
    news: { id: number; title: string; summary: string; description: string; authorName: string; createdOn: string };
    comments: { id: number; content: string; authorName: string; createdOn: string }[];
    isAdmin: boolean;
}

export function NewsDetail({ projectId, projectIdentifier, news, comments, isAdmin }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(news.title);
    const [summary, setSummary] = useState(news.summary);
    const [description, setDescription] = useState(news.description);
    const [newComment, setNewComment] = useState("");

    const handleUpdate = () => {
        startTransition(async () => {
            const result = await updateNewsAction(projectId, projectIdentifier, news.id, { title, summary, description });
            if (result.success) { setEditing(false); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleDelete = () => {
        if (!confirm("Delete this news?")) return;
        startTransition(async () => {
            const result = await deleteNewsAction(projectId, projectIdentifier, news.id);
            if (result.success) router.push(`/projects/${projectIdentifier}/news`);
            else alert(result.error);
        });
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        startTransition(async () => {
            const result = await addCommentAction(projectId, projectIdentifier, news.id, newComment);
            if (result.success) { setNewComment(""); router.refresh(); }
            else alert(result.error);
        });
    };

    const handleDeleteComment = (commentId: number) => {
        if (!confirm("Delete this comment?")) return;
        startTransition(async () => {
            const result = await deleteCommentAction(projectId, projectIdentifier, news.id, commentId);
            if (result.success) router.refresh();
            else alert(result.error);
        });
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* News Content */}
            {editing ? (
                <div className="space-y-3">
                    <div><label className="text-sm font-medium">Title</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" /></div>
                    <div><label className="text-sm font-medium">Summary</label><input value={summary} onChange={e => setSummary(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" /></div>
                    <div><label className="text-sm font-medium">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1 min-h-[150px]" /></div>
                    <div className="flex gap-2"><Button onClick={handleUpdate} disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
                </div>
            ) : (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold">{news.title}</h2>
                        {isAdmin && (
                            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button><Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>Delete</Button></div>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">Added by {news.authorName} · {news.createdOn ? new Date(news.createdOn).toLocaleDateString() : ""}</div>
                    {news.summary && <p className="text-sm text-gray-500 italic mb-3">{news.summary}</p>}
                    {news.description && <div className="prose dark:prose-invert max-w-none text-sm"><ReactMarkdown>{news.description}</ReactMarkdown></div>}
                </div>
            )}

            {/* Comments */}
            <div className="border-t pt-4">
                <h3 className="font-semibold text-sm text-gray-500 mb-3">Comments ({comments.length})</h3>
                {comments.length > 0 && (
                    <div className="space-y-3 mb-4">
                        {comments.map(c => (
                            <div key={c.id} className="bg-gray-50 dark:bg-gray-800 rounded p-3 group">
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span><strong>{c.authorName}</strong> · {c.createdOn ? new Date(c.createdOn).toLocaleDateString() : ""}</span>
                                    {isAdmin && <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 text-xs">Delete</button>}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="space-y-2">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} className="w-full border rounded px-3 py-2 text-sm min-h-[60px]" placeholder="Add a comment..." />
                    <Button size="sm" onClick={handleAddComment} disabled={isPending || !newComment.trim()}>{isPending ? "Adding..." : "Add comment"}</Button>
                </div>
            </div>
        </div>
    );
}
