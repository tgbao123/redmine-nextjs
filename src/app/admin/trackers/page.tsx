import { prisma } from "@/lib/db/prisma";
import { TrackerList } from "./tracker-list";

export default async function AdminTrackersPage() {
    const [trackers, statuses] = await Promise.all([
        prisma.trackers.findMany({ orderBy: { position: "asc" } }),
        prisma.issue_statuses.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    ]);
    return <TrackerList trackers={trackers.map(t => ({ ...t, position: t.position || 0 }))} statuses={statuses} />;
}
