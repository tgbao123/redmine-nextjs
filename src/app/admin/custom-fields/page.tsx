import { prisma } from "@/lib/db/prisma";
import { CustomFieldList } from "./field-list";

export default async function AdminCustomFieldsPage() {
    const fields = await prisma.custom_fields.findMany({ orderBy: [{ type: "asc" }, { position: "asc" }] });
    return <CustomFieldList fields={fields.map(f => ({ id: f.id, name: f.name, type: f.type || "", field_format: f.field_format || "", is_required: f.is_required, is_filter: f.is_filter, searchable: f.searchable ?? false, position: f.position || 0 }))} />;
}
