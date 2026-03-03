import { prisma } from "@/lib/db/prisma";
import { WorkflowMatrix } from "./workflow-matrix";

export default async function AdminWorkflowsPage() {
    const [roles, trackers, statuses] = await Promise.all([
        prisma.roles.findMany({ where: { builtin: 0 }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
        prisma.trackers.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
        prisma.issue_statuses.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    ]);
    return <WorkflowMatrix roles={roles} trackers={trackers} statuses={statuses} />;
}
