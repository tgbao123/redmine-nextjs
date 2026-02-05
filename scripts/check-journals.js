const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get issue 29037 details
    const issue = await prisma.issues.findFirst({
        where: { id: 29037 }
    });
    console.log("Issue #29037 created_on:", issue?.created_on);
    console.log("Issue #29037 updated_on:", issue?.updated_on);

    // Get time entries for issue 29037
    const timeEntries = await prisma.time_entries.findMany({
        where: { issue_id: 29037 },
        orderBy: { created_on: 'desc' }
    });

    console.log("\nTime entries for issue #29037:", timeEntries.length);
    for (const t of timeEntries) {
        console.log(`  Time entry ${t.id}: ${t.created_on.toISOString()} - ${t.hours} hours`);
    }

    // Get journals again with more details
    const journals = await prisma.journals.findMany({
        where: {
            journalized_type: "Issue",
            journalized_id: 29037
        },
        orderBy: { created_on: 'desc' }
    });

    console.log("\nAll journals for issue #29037:", journals.length);
    for (const j of journals) {
        const details = await prisma.journal_details.findMany({
            where: { journal_id: j.id }
        });
        console.log(`  Journal ${j.id}: ${j.created_on.toISOString()}`);
        for (const d of details) {
            console.log(`    ${d.prop_key}: ${d.old_value} -> ${d.value}`);
        }
    }

    // Get all statuses
    const statuses = await prisma.issue_statuses.findMany();
    console.log("\nStatus mapping:");
    for (const s of statuses) {
        console.log(`  ${s.id}: ${s.name}`);
    }
}

main().then(() => prisma.$disconnect()).catch(e => console.error(e));
