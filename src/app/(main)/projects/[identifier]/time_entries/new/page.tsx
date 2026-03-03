import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { TimeEntryForm } from "./time-entry-form";

interface Props { params: Promise<{ identifier: string }> }

export default async function NewTimeEntryPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;

    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();

    const [activities, issues] = await Promise.all([
        prisma.enumerations.findMany({ where: { type: "TimeEntryActivity", active: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
        prisma.issues.findMany({ where: { project_id: project.id }, select: { id: true, subject: true }, orderBy: { id: "desc" }, take: 200 }),
    ]);

    return <TimeEntryForm project={project} activities={activities} issues={issues} />;
}
