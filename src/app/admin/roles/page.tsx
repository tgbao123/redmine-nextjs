import { prisma } from "@/lib/db/prisma";
import { RoleEditor } from "./role-editor";
import { parsePermissions } from "@/lib/permissions/constants";

export default async function AdminRolesPage() {
    const roles = await prisma.roles.findMany({ orderBy: { position: "asc" } });
    const rolesData = roles.map((r) => ({
        id: r.id, name: r.name, builtin: r.builtin, assignable: r.assignable,
        permissions: parsePermissions(r.permissions || ""),
        position: r.position || 0,
    }));

    return <RoleEditor roles={rolesData} />;
}
