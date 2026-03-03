"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateSettingAction } from "@/lib/admin/actions";

const SETTING_FIELDS = [
    { key: "app_title", label: "Application title", type: "text" },
    { key: "welcome_text", label: "Welcome text", type: "textarea" },
    { key: "host_name", label: "Host name and path", type: "text" },
    { key: "protocol", label: "Protocol", type: "select", options: ["http", "https"] },
    { key: "default_language", label: "Default language", type: "select", options: ["en", "ja", "vi", "zh"] },
    { key: "login_required", label: "Authentication required", type: "bool" },
    { key: "self_registration", label: "Self-registration", type: "select", options: ["0", "1", "2", "3"] },
    { key: "per_page_options", label: "Objects per page options", type: "text" },
];

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [values, setValues] = useState(settings);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        startTransition(async () => {
            for (const [key, value] of Object.entries(values)) {
                if (value !== settings[key]) {
                    await updateSettingAction(key, value);
                }
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            router.refresh();
        });
    };

    return (
        <div className="space-y-4 max-w-2xl">
            <h1 className="text-2xl font-bold">Settings</h1>
            {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">Settings saved successfully!</div>}
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-4">
                {SETTING_FIELDS.map(f => (
                    <div key={f.key} className="flex items-start gap-3">
                        <label className="text-sm font-medium w-48 pt-1.5">{f.label}</label>
                        {f.type === "textarea" ? (
                            <textarea value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                                className="border rounded px-3 py-2 text-sm flex-1 min-h-[80px]" />
                        ) : f.type === "bool" ? (
                            <input type="checkbox" checked={values[f.key] === "1"} onChange={(e) => setValues({ ...values, [f.key]: e.target.checked ? "1" : "0" })} className="mt-2" />
                        ) : f.type === "select" ? (
                            <select value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                                className="border rounded px-3 py-1.5 text-sm">{f.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>
                        ) : (
                            <input value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                                className="border rounded px-3 py-1.5 text-sm flex-1" />
                        )}
                    </div>
                ))}
                <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
            </div>
        </div>
    );
}
