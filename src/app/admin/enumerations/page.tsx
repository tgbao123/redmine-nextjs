import { prisma } from "@/lib/db/prisma";
import { EnumList } from "./enum-list";

export default async function AdminEnumerationsPage() {
    const enums = await prisma.enumerations.findMany({ orderBy: [{ type: "asc" }, { position: "asc" }] });
    return <EnumList enums={enums.map(e => ({ id: e.id, name: e.name, type: e.type || "", active: e.active, is_default: e.is_default, position: e.position || 0 }))} />;
}
