"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createTopicAction } from "@/lib/boards/actions";

interface Props { projectId: number; projectIdentifier: string; boardId: number }

export function NewTopicForm({ projectId, projectIdentifier, boardId }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");

    const handleSubmit = () => {
        if (!subject.trim()) { alert("Subject is required"); return; }
        startTransition(async () => {
            const result = await createTopicAction(projectId, projectIdentifier, boardId, { subject, content });
            if (result.success && result.topicId) {
                router.push(`/projects/${projectIdentifier}/boards/${boardId}/topics/${result.topicId}`);
            } else { alert(result.error || "Failed"); }
        });
    };

    return (
        <div className="max-w-2xl space-y-4">
            <div>
                <label className="text-sm font-medium">Subject *</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1" placeholder="Topic subject" />
            </div>
            <div>
                <label className="text-sm font-medium">Content</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1 min-h-[150px]" placeholder="Write your message..." />
            </div>
            <div className="flex gap-3">
                <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
        </div>
    );
}
