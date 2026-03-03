"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { replyToTopicAction } from "@/lib/boards/actions";

interface Message { id: number; subject: string; content: string; author: string; createdOn: string }
interface Props {
    project: { id: number; name: string; identifier: string | null };
    board: { id: number; name: string };
    topic: Message; replies: Message[];
}

export function ThreadView({ project, board, topic, replies }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [replyContent, setReplyContent] = useState("");
    const [showReply, setShowReply] = useState(false);
    const basePath = `/projects/${project.identifier}`;

    const handleReply = () => {
        if (!replyContent.trim()) return;
        startTransition(async () => {
            const r = await replyToTopicAction(project.id, project.identifier || "", board.id, topic.id, { subject: `RE: ${topic.subject}`, content: replyContent });
            if (r.success) { setReplyContent(""); setShowReply(false); router.refresh(); } else alert(r.error);
        });
    };

    const renderMessage = (msg: Message, isFirst: boolean) => (
        <div key={msg.id} className={`border rounded-lg p-4 ${isFirst ? "border-blue-200 bg-blue-50/30 dark:bg-blue-950/20" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{msg.author}</span>
                <span className="text-xs text-muted-foreground">{msg.createdOn ? new Date(msg.createdOn).toLocaleString() : ""}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
        </div>
    );

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold">
                    <Link href={basePath} className="hover:underline">{project.name}</Link> » <Link href={`${basePath}/boards`} className="hover:underline">Forums</Link> » <Link href={`${basePath}/boards/${board.id}`} className="hover:underline">{board.name}</Link>
                </h1>
            </div>
            <div className="px-6 py-4 space-y-4">
                <h2 className="text-xl font-bold">{topic.subject}</h2>
                <div className="space-y-3">
                    {renderMessage(topic, true)}
                    {replies.map(r => renderMessage(r, false))}
                </div>
                {!showReply ? (
                    <Button variant="outline" size="sm" onClick={() => setShowReply(true)}>Reply</Button>
                ) : (
                    <div className="space-y-2 border rounded-lg p-4">
                        <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} className="w-full border rounded p-3 text-sm min-h-[100px]" placeholder="Write a reply..." />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleReply} disabled={isPending}>{isPending ? "Posting..." : "Post Reply"}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowReply(false)}>Cancel</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
