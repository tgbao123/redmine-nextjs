import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import NewNewsForm from "./news-form";

interface Props { params: Promise<{ identifier: string }> }

export default async function NewNewsPage({ params }: Props) {
    const user = await getSession();
    if (!user) redirect("/login");
    const { identifier } = await params;
    const project = await prisma.projects.findFirst({
        where: { OR: [{ identifier }, { id: parseInt(identifier) || 0 }] },
        select: { id: true, name: true, identifier: true },
    });
    if (!project) notFound();
    return <NewNewsForm project={project} />;
}
