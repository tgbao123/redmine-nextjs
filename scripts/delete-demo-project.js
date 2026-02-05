const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteProject() {
    // Find the project
    const project = await prisma.projects.findFirst({
        where: { name: 'Demo Project' }
    });

    if (!project) {
        console.log('Project not found');
        return;
    }

    console.log('Found project:', project.id, project.name, project.identifier);

    // Delete in order (due to foreign keys)
    // 1. enabled_modules
    await prisma.enabled_modules.deleteMany({ where: { project_id: project.id } });
    console.log('Deleted enabled_modules');

    // 2. member_roles (via members)
    const members = await prisma.members.findMany({ where: { project_id: project.id } });
    for (const m of members) {
        await prisma.member_roles.deleteMany({ where: { member_id: m.id } });
    }
    console.log('Deleted member_roles');

    // 3. members
    await prisma.members.deleteMany({ where: { project_id: project.id } });
    console.log('Deleted members');

    // 4. projects_trackers
    await prisma.projects_trackers.deleteMany({ where: { project_id: project.id } });
    console.log('Deleted projects_trackers');

    // 5. custom_values
    await prisma.custom_values.deleteMany({
        where: { customized_type: 'Project', customized_id: project.id }
    });
    console.log('Deleted custom_values');

    // 6. project itself
    await prisma.projects.delete({ where: { id: project.id } });
    console.log('Deleted project:', project.name);
}

deleteProject().catch(console.error).finally(() => prisma.$disconnect());
