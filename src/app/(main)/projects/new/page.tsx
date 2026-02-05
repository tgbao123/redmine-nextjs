import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProjectForm } from "./project-form";

async function getParentProjects() {
    const projects = await prisma.projects.findMany({
        where: { status: 1 },
        select: { id: true, name: true, identifier: true },
        orderBy: { name: "asc" }
    });
    return projects;
}

async function getTrackers() {
    const trackers = await prisma.trackers.findMany({
        select: { id: true, name: true },
        orderBy: { position: "asc" }
    });
    return trackers;
}

async function getProjectCustomFields() {
    // Get custom fields that apply to projects (type = "ProjectCustomField")
    const customFields = await prisma.custom_fields.findMany({
        where: { type: "ProjectCustomField" },
        select: {
            id: true,
            name: true,
            field_format: true,
            is_required: true,
            default_value: true,
        },
        orderBy: { position: "asc" }
    });
    return customFields;
}

async function getIssueCustomFields() {
    // Get custom fields for issues that can be enabled per project
    const customFields = await prisma.custom_fields.findMany({
        where: { type: "IssueCustomField" },
        select: {
            id: true,
            name: true,
            is_for_all: true,
        },
        orderBy: { position: "asc" }
    });
    return customFields;
}

export default async function NewProjectPage() {
    const user = await getSession();

    if (!user) {
        redirect("/login");
    }

    // Only admin can create projects (for now)
    if (!user.admin) {
        redirect("/projects");
    }

    const [parentProjects, trackers, customFields, issueCustomFields] = await Promise.all([
        getParentProjects(),
        getTrackers(),
        getProjectCustomFields(),
        getIssueCustomFields()
    ]);

    return (
        <ProjectForm
            parentProjects={parentProjects}
            trackers={trackers}
            customFields={customFields}
            issueCustomFields={issueCustomFields}
        />
    );
}
