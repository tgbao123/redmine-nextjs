"use client";

import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/components/providers/i18n-provider";

interface Project {
    id: number;
    name: string;
    identifier: string | null;
    description: string | null;
    is_public: boolean;
    parent_id: number | null;
    created_on: Date | null;
    status: number;
}

interface ProjectListProps {
    projects: Project[];
    isAdmin: boolean;
    showClosed?: boolean;
}

export function ProjectList({ projects, isAdmin, showClosed = false }: ProjectListProps) {
    const { t } = useI18n();
    const [viewClosedProjects, setViewClosedProjects] = useState(showClosed);

    // Filter by status (1 = active, 5 = closed)
    const filteredProjects = projects.filter(p => {
        if (viewClosedProjects) {
            return p.status === 5; // Show only closed
        }
        return p.status === 1; // Show only active
    });

    // Build tree structure
    type ProjectNode = Project & { children: ProjectNode[] };
    const projectMap = new Map<number, ProjectNode>();
    const rootProjects: ProjectNode[] = [];

    filteredProjects.forEach(p => {
        projectMap.set(p.id, { ...p, children: [] });
    });

    filteredProjects.forEach(p => {
        const project = projectMap.get(p.id)!;
        if (p.parent_id && projectMap.has(p.parent_id)) {
            projectMap.get(p.parent_id)!.children.push(project);
        } else {
            rootProjects.push(project);
        }
    });

    // Render project with children recursively
    const renderProject = (project: ProjectNode, depth = 0): React.ReactNode => (
        <div key={project.id} className="py-1">
            <div className="flex items-start gap-1">
                {/* Indent arrows for subprojects */}
                {depth > 0 && (
                    <span className="text-muted-foreground text-sm shrink-0" style={{ marginLeft: `${(depth - 1) * 16}px` }}>
                        »
                    </span>
                )}
                <div className="min-w-0">
                    <Link
                        href={`/projects/${project.identifier || project.id}`}
                        className="text-primary hover:underline font-medium"
                    >
                        {project.name}
                    </Link>
                    {!project.is_public && (
                        <span className="ml-1 text-xs text-muted-foreground">🔒</span>
                    )}
                    {project.description && (
                        <div className="text-sm text-muted-foreground prose prose-sm prose-gray dark:prose-invert max-w-none">
                            <ReactMarkdown>{project.description}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
            {/* Render children directly below parent */}
            {project.children.length > 0 && (
                <div className="ml-4">
                    {project.children.map(child => renderProject(child, depth + 1))}
                </div>
            )}
        </div>
    );

    // Split root projects into 3 columns (children stay with parent)
    const columnCount = 3;
    const itemsPerColumn = Math.ceil(rootProjects.length / columnCount);
    const columns: ProjectNode[][] = [];
    for (let i = 0; i < columnCount; i++) {
        columns.push(rootProjects.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn));
    }

    return (
        <div className="space-y-4">
            {/* Tabs Bar */}
            <div className="flex items-center gap-1 border-b">
                <span className="px-3 py-2 text-sm font-medium bg-primary/10 text-primary border-b-2 border-primary">
                    Projects
                </span>
                <Link href="#" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary">
                    Activity
                </Link>
                <Link href="#" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary">
                    Issues
                </Link>
                <Link href="#" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary">
                    Spent time
                </Link>
                <Link href="#" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary">
                    Gantt
                </Link>
                <Link href="#" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary">
                    Calendar
                </Link>
                <Link href="#" className="px-3 py-2 text-sm text-muted-foreground hover:text-primary">
                    News
                </Link>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t.projects.title}</h2>
                <div className="flex items-center gap-4 text-sm">
                    <button
                        onClick={() => setViewClosedProjects(!viewClosedProjects)}
                        className="text-primary hover:underline"
                    >
                        {viewClosedProjects ? "View active projects" : "View closed projects"}
                    </button>
                    {isAdmin && (
                        <Link href="/projects/new" className="text-primary hover:underline">
                            + New project
                        </Link>
                    )}
                </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                    {viewClosedProjects ? "No closed projects." : t.projects.noProjects}
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
                    {columns.map((column, colIndex) => (
                        <div key={colIndex}>
                            {column.map(project => renderProject(project))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
