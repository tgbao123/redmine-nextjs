"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { createProjectAction } from "@/lib/projects/actions";

interface ParentProject {
    id: number;
    name: string;
    identifier: string | null;
}

interface Tracker {
    id: number;
    name: string;
}

interface CustomField {
    id: number;
    name: string;
    field_format: string;
    is_required: boolean;
    default_value: string | null;
}

interface IssueCustomField {
    id: number;
    name: string;
    is_for_all: boolean;
}

interface ProjectFormProps {
    parentProjects: ParentProject[];
    trackers: Tracker[];
    customFields: CustomField[];
    issueCustomFields: IssueCustomField[];
}

// Default modules in Redmine
const MODULES = [
    { id: "issue_tracking", name: "Issue tracking", defaultEnabled: true },
    { id: "time_tracking", name: "Time tracking", defaultEnabled: true },
    { id: "news", name: "News", defaultEnabled: true },
    { id: "documents", name: "Documents", defaultEnabled: true },
    { id: "files", name: "Files", defaultEnabled: true },
    { id: "wiki", name: "Wiki", defaultEnabled: true },
    { id: "repository", name: "Repository", defaultEnabled: false },
    { id: "boards", name: "Forums", defaultEnabled: true },
    { id: "calendar", name: "Calendar", defaultEnabled: true },
    { id: "gantt", name: "Gantt", defaultEnabled: true },
];

export function ProjectForm({ parentProjects, trackers, customFields, issueCustomFields }: ProjectFormProps) {
    const { t } = useI18n();
    const router = useRouter();

    const [state, formAction, isPending] = useActionState(
        async (_prevState: { error?: string; success?: boolean; identifier?: string | null; continue?: boolean } | null, formData: FormData) => {
            const result = await createProjectAction(formData);
            if (result.success && result.identifier) {
                router.push(`/projects/${result.identifier}`);
            }
            return result;
        },
        null
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t.projects.newProject}</h1>
                <p className="text-muted-foreground">{t.projects.subtitle}</p>
            </div>

            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>{t.projects.newProject}</CardTitle>
                </CardHeader>
                <CardContent>
                    {state?.error && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                            {state.error}
                        </div>
                    )}
                    <form action={formAction} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    {t.projects.name} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    placeholder="My Project"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label htmlFor="description" className="text-sm font-medium">
                                    {t.projects.description}
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={6}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder="Project description..."
                                />
                            </div>

                            <div className="grid gap-2">
                                <label htmlFor="identifier" className="text-sm font-medium">
                                    {t.projects.identifier} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="identifier"
                                    name="identifier"
                                    required
                                    placeholder="my-project"
                                    pattern="[a-z0-9-]+"
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Length between 1 and 100 characters. Only lowercase letters (a-z), numbers, dashes and underscores are allowed.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <label htmlFor="homepage" className="text-sm font-medium">
                                    {t.projects.homepage}
                                </label>
                                <Input
                                    id="homepage"
                                    name="homepage"
                                    type="url"
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_public"
                                    name="is_public"
                                    className="h-4 w-4 rounded border-input"
                                />
                                <label htmlFor="is_public" className="text-sm font-medium">
                                    {t.projects.isPublic}
                                </label>
                            </div>

                            <div className="grid gap-2">
                                <label htmlFor="parent_id" className="text-sm font-medium">
                                    Subproject of
                                </label>
                                <select
                                    id="parent_id"
                                    name="parent_id"
                                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">-- None --</option>
                                    {parentProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="inherit_members"
                                    name="inherit_members"
                                    className="h-4 w-4 rounded border-input"
                                />
                                <label htmlFor="inherit_members" className="text-sm font-medium">
                                    Inherit members
                                </label>
                            </div>
                        </div>

                        {/* Modules Section */}
                        <div className="border-t pt-4">
                            <label className="text-sm font-medium block mb-3">Modules</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {MODULES.map(mod => (
                                    <div key={mod.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`module_${mod.id}`}
                                            name="modules"
                                            value={mod.id}
                                            defaultChecked={mod.defaultEnabled}
                                            className="h-4 w-4 rounded border-input"
                                        />
                                        <label htmlFor={`module_${mod.id}`} className="text-sm">
                                            {mod.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trackers Section */}
                        {trackers.length > 0 && (
                            <div className="border-t pt-4">
                                <label className="text-sm font-medium block mb-3">Trackers</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {trackers.map(tracker => (
                                        <div key={tracker.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`tracker_${tracker.id}`}
                                                name="trackers"
                                                value={tracker.id}
                                                defaultChecked
                                                className="h-4 w-4 rounded border-input"
                                            />
                                            <label htmlFor={`tracker_${tracker.id}`} className="text-sm">
                                                {tracker.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Fields Section */}
                        {customFields.length > 0 && (
                            <div className="border-t pt-4">
                                <label className="text-sm font-medium block mb-3">Custom fields</label>
                                <div className="space-y-3">
                                    {customFields.map(field => (
                                        <div key={field.id} className="grid gap-2">
                                            <label htmlFor={`cf_${field.id}`} className="text-sm font-medium">
                                                {field.name}
                                                {field.is_required && <span className="text-red-500"> *</span>}
                                            </label>
                                            {field.field_format === "text" ? (
                                                <textarea
                                                    id={`cf_${field.id}`}
                                                    name={`custom_field_${field.id}`}
                                                    rows={3}
                                                    defaultValue={field.default_value || ""}
                                                    required={field.is_required}
                                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                            ) : field.field_format === "bool" ? (
                                                <input
                                                    type="checkbox"
                                                    id={`cf_${field.id}`}
                                                    name={`custom_field_${field.id}`}
                                                    defaultChecked={field.default_value === "1"}
                                                    className="h-4 w-4 rounded border-input"
                                                />
                                            ) : (
                                                <Input
                                                    id={`cf_${field.id}`}
                                                    name={`custom_field_${field.id}`}
                                                    defaultValue={field.default_value || ""}
                                                    required={field.is_required}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Issue Custom Fields Section */}
                        {issueCustomFields.length > 0 && (
                            <div className="border-t pt-4">
                                <label className="text-sm font-medium block mb-3">Custom fields</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {issueCustomFields.map(field => (
                                        <div key={field.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`issue_cf_${field.id}`}
                                                name="issue_custom_fields"
                                                value={field.id}
                                                defaultChecked={field.is_for_all}
                                                disabled={field.is_for_all}
                                                className="h-4 w-4 rounded border-input disabled:opacity-50"
                                            />
                                            <label htmlFor={`issue_cf_${field.id}`} className={`text-sm ${field.is_for_all ? 'text-muted-foreground' : ''}`}>
                                                {field.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? t.common.loading : t.common.create}
                            </Button>
                            <Button type="submit" name="continue" value="1" variant="secondary" disabled={isPending}>
                                Create and continue
                            </Button>
                            <Link
                                href="/projects"
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            >
                                {t.common.cancel}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
