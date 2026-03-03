import { prisma } from "@/lib/db/prisma";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
    const settings = await prisma.settings.findMany();
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.name] = s.value || ""; });
    return <SettingsForm settings={map} />;
}
