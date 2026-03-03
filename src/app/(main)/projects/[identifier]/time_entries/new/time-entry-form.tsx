"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createTimeEntryAction } from "@/lib/time-entries/actions";

interface Props {
    project: { id: number; name: string; identifier: string | null };
    activities: { id: number; name: string }[];
    issues: { id: number; subject: string }[];
}

export function TimeEntryForm({ project, activities, issues }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [hours, setHours] = useState("");
    const [activityId, setActivityId] = useState(activities[0]?.id || 0);
    const [spentOn, setSpentOn] = useState(new Date().toISOString().split("T")[0]);
    const [issueId, setIssueId] = useState("");
    const [comments, setComments] = useState("");
    const [error, setError] = useState<string | null>(null);

    const basePath = `/projects/${project.identifier}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hours || parseFloat(hours) <= 0) { setError("Hours must be > 0"); return; }

        startTransition(async () => {
            const r = await createTimeEntryAction({
                projectId: project.id, hours: parseFloat(hours), activityId,
                spentOn, issueId: issueId ? parseInt(issueId) : null,
                comments, projectIdentifier: project.identifier || "",
            });
            if (r.success) { router.push(`${basePath}/time_entries`); }
            else setError(r.error || "Failed");
        });
    };

    return (
        <div className="space-y-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3">
                <h1 className="text-lg font-semibold"><Link href={basePath} className="hover:underline">{project.name}</Link> » Log time</h1>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-6 max-w-lg space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="flex items-center gap-3"><label className="text-sm font-medium w-28">Issue</label>
                    <select value={issueId} onChange={(e) => setIssueId(e.target.value)} className="border rounded px-3 py-1.5 text-sm flex-1">
                        <option value="">-- None --</option>{issues.map(i => <option key={i.id} value={i.id}>#{i.id} {i.subject.substring(0, 60)}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-3"><label className="text-sm font-medium w-28">Date <span className="text-red-500">*</span></label>
                    <input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} className="border rounded px-3 py-1.5 text-sm" required />
                </div>
                <div className="flex items-center gap-3"><label className="text-sm font-medium w-28">Hours <span className="text-red-500">*</span></label>
                    <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-28" min="0.01" step="0.25" required />
                </div>
                <div className="flex items-center gap-3"><label className="text-sm font-medium w-28">Activity <span className="text-red-500">*</span></label>
                    <select value={activityId} onChange={(e) => setActivityId(Number(e.target.value))} className="border rounded px-3 py-1.5 text-sm">
                        {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-3"><label className="text-sm font-medium w-28">Comment</label>
                    <input value={comments} onChange={(e) => setComments(e.target.value)} className="border rounded px-3 py-1.5 text-sm flex-1" />
                </div>
                <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Create"}</Button>
                    <Link href={`${basePath}/time_entries`}><Button type="button" variant="ghost">Cancel</Button></Link>
                </div>
            </form>
        </div>
    );
}
