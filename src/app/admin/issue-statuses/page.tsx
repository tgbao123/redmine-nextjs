import { prisma } from "@/lib/db/prisma";
import { StatusList } from "./status-list";

export default async function AdminStatusesPage() {
    const statuses = await prisma.issue_statuses.findMany({ orderBy: { position: "asc" } });
    return <StatusList statuses={statuses.map(s => ({ ...s, position: s.position || 0, default_done_ratio: s.default_done_ratio ?? null }))} />;
}
