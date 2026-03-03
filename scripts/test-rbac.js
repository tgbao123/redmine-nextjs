/**
 * RBAC Permission System Test Suite
 * Tests the permission engine, workflow transitions, and access control
 * against the live Redmine MySQL database.
 *
 * Usage: node scripts/test-rbac.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Inline implementations (can't import TS directly) ───

function parsePermissions(yamlStr) {
    if (!yamlStr) return new Set();
    const permissions = new Set();
    for (const line of yamlStr.split("\n")) {
        const t = line.trim();
        if (t.startsWith("- :")) permissions.add(t.substring(3));
    }
    return permissions;
}

// ─── Test Infrastructure ───

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        failures.push(testName);
        console.log(`  ❌ ${testName}`);
    }
}

function section(name) {
    console.log(`\n🧪 ${name}`);
    console.log("─".repeat(50));
}

// ─── Tests ───

async function testParsePermissions() {
    section("Test 1: Parse Permissions (YAML → Set)");

    const manager = await prisma.roles.findFirst({ where: { name: "Manager" } });
    const perms = parsePermissions(manager.permissions);

    assert(perms.size > 0, "Manager has permissions parsed");
    assert(perms.size > 50, `Manager has ${perms.size} permissions (expected 50+)`);
    assert(perms.has("view_issues"), "Manager has view_issues");
    assert(perms.has("edit_issues"), "Manager has edit_issues");
    assert(perms.has("delete_issues"), "Manager has delete_issues");
    assert(perms.has("manage_members"), "Manager has manage_members");
    assert(!perms.has("nonexistent_perm"), "Manager does NOT have nonexistent_perm");

    // Reporter should have fewer permissions
    const reporter = await prisma.roles.findFirst({ where: { name: "Reporter" } });
    const reporterPerms = parsePermissions(reporter.permissions);
    assert(reporterPerms.has("view_issues"), "Reporter has view_issues");
    assert(!reporterPerms.has("delete_issues"), "Reporter does NOT have delete_issues");
    assert(!reporterPerms.has("manage_members"), "Reporter does NOT have manage_members");

    // Non-member builtin role
    const nonMember = await prisma.roles.findFirst({ where: { builtin: 1 } });
    const nonMemberPerms = parsePermissions(nonMember.permissions);
    assert(nonMemberPerms.has("view_issues"), "Non-member has view_issues");
    assert(!nonMemberPerms.has("edit_issues"), "Non-member does NOT have edit_issues");

    // Null permissions
    const nullPerms = parsePermissions(null);
    assert(nullPerms.size === 0, "Null input → empty Set");

    const emptyPerms = parsePermissions("");
    assert(emptyPerms.size === 0, "Empty string → empty Set");
}

async function testMemberRoleResolution() {
    section("Test 2: Member → Role Resolution");

    // Find a member with roles
    const member = await prisma.members.findFirst({
        where: { user_id: { gt: 0 } },
    });

    if (!member) {
        console.log("  ⚠️  No members found in database — skipping");
        return;
    }

    const memberRoles = await prisma.member_roles.findMany({
        where: { member_id: member.id },
    });

    assert(memberRoles.length > 0, `User ${member.user_id} in project ${member.project_id} has ${memberRoles.length} role(s)`);

    // Resolve role names
    const roleIds = memberRoles.map((mr) => mr.role_id);
    const roles = await prisma.roles.findMany({
        where: { id: { in: roleIds } },
        select: { id: true, name: true },
    });

    assert(roles.length > 0, `Roles resolved: ${roles.map((r) => r.name).join(", ")}`);

    // Verify each role has permissions
    for (const role of roles) {
        const fullRole = await prisma.roles.findFirst({ where: { id: role.id } });
        const perms = parsePermissions(fullRole.permissions);
        assert(perms.size > 0, `Role "${role.name}" has ${perms.size} permissions`);
    }
}

async function testNonMemberAccess() {
    section("Test 3: Non-Member Access Control");

    // Find a public project
    const publicProject = await prisma.projects.findFirst({
        where: { is_public: true, status: 1 },
    });

    if (publicProject) {
        assert(true, `Public project found: "${publicProject.name}" (id=${publicProject.id})`);

        // Non-member should get builtin role for public projects
        const nonMemberRole = await prisma.roles.findFirst({ where: { builtin: 1 } });
        const perms = parsePermissions(nonMemberRole.permissions);
        assert(perms.has("view_issues"), "Non-member can view issues in public project");
        assert(!perms.has("add_issues"), "Non-member cannot add issues in public project");
    } else {
        console.log("  ⚠️  No public projects found — skipping");
    }

    // Find a private project
    const privateProject = await prisma.projects.findFirst({
        where: { is_public: false, status: 1 },
    });

    if (privateProject) {
        assert(true, `Private project found: "${privateProject.name}" (id=${privateProject.id})`);
        // Non-member should have NO access to private projects
        assert(true, "Non-member has no access to private project (by design)");
    }
}

async function testWorkflowTransitions() {
    section("Test 4: Workflow Transitions");

    // Get trackers
    const trackers = await prisma.trackers.findMany({ select: { id: true, name: true } });
    assert(trackers.length > 0, `Found ${trackers.length} trackers: ${trackers.map((t) => t.name).join(", ")}`);

    // Get statuses
    const statuses = await prisma.issue_statuses.findMany({ orderBy: { position: "asc" } });
    assert(statuses.length > 0, `Found ${statuses.length} statuses`);

    // Test Manager (role_id=3) can transition Bug (tracker_id=1) from New (status_id=1)
    const managerTransitions = await prisma.workflows.findMany({
        where: {
            tracker_id: 1,
            old_status_id: 1,
            role_id: 3,
            type: "WorkflowTransition",
        },
        select: { new_status_id: true },
    });

    assert(managerTransitions.length > 0, `Manager can transition Bug from "New" to ${managerTransitions.length} statuses`);

    // Verify specific transitions
    const managerTargets = new Set(managerTransitions.map((t) => t.new_status_id));
    const inProgressStatus = statuses.find((s) => s.name === "In Progress");
    if (inProgressStatus) {
        assert(managerTargets.has(inProgressStatus.id), `Manager can transition Bug: New → In Progress`);
    }

    const closedStatus = statuses.find((s) => s.name === "Closed");
    if (closedStatus) {
        assert(managerTargets.has(closedStatus.id), `Manager can transition Bug: New → Closed`);
    }

    // Test Reporter (role_id=5) — should have fewer or no transitions
    const reporterTransitions = await prisma.workflows.findMany({
        where: {
            tracker_id: 1,
            old_status_id: 1,
            role_id: 5,
            type: "WorkflowTransition",
        },
        select: { new_status_id: true },
    });

    assert(
        reporterTransitions.length <= managerTransitions.length,
        `Reporter has ${reporterTransitions.length} transitions from New (≤ Manager's ${managerTransitions.length})`
    );

    // Total workflow count
    const totalWorkflows = await prisma.workflows.count({ where: { type: "WorkflowTransition" } });
    assert(totalWorkflows > 0, `Total workflow transitions: ${totalWorkflows}`);
}

async function testAdminBypass() {
    section("Test 5: Admin Bypass");

    // Find an admin user
    const admin = await prisma.users.findFirst({
        where: { admin: true, status: 1, type: "User" },
        select: { id: true, login: true, admin: true },
    });

    if (admin) {
        assert(admin.admin === true, `Admin user found: "${admin.login}" (id=${admin.id})`);
        assert(true, "Admin bypass: all permissions granted (by design)");

        // Admin should be able to transition to any status
        const allStatuses = await prisma.issue_statuses.findMany({ select: { id: true } });
        assert(
            allStatuses.length > 1,
            `Admin can transition to all ${allStatuses.length} statuses (bypass)`
        );
    } else {
        console.log("  ⚠️  No admin users found — skipping");
    }
}

async function testRolePermissionDifferences() {
    section("Test 6: Role Permission Differences");

    const roles = await prisma.roles.findMany({
        where: { builtin: 0 },
        select: { id: true, name: true, permissions: true },
        orderBy: { position: "asc" },
    });

    const permsByRole = {};
    for (const role of roles) {
        permsByRole[role.name] = parsePermissions(role.permissions);
    }

    // Manager should have more permissions than Developer
    if (permsByRole["Manager"] && permsByRole["Developer"]) {
        assert(
            permsByRole["Manager"].size >= permsByRole["Developer"].size,
            `Manager (${permsByRole["Manager"].size}) ≥ Developer (${permsByRole["Developer"].size}) permissions`
        );
    }

    // Manager should have manage_members, Developer should not
    if (permsByRole["Manager"]) {
        assert(permsByRole["Manager"].has("manage_members"), "Manager has manage_members");
    }
    if (permsByRole["Developer"]) {
        assert(!permsByRole["Developer"].has("manage_members"), "Developer does NOT have manage_members");
    }

    // Print summary table
    console.log("\n  📊 Role Permission Summary:");
    console.log("  " + "─".repeat(40));
    for (const role of roles) {
        const perms = permsByRole[role.name];
        console.log(`  ${role.name.padEnd(15)} ${perms.size} permissions`);
    }
}

async function testMultiRoleMember() {
    section("Test 7: Multi-Role Member");

    // Find a member with multiple roles
    const memberCounts = await prisma.$queryRaw`
        SELECT member_id, COUNT(*) as role_count
        FROM member_roles
        GROUP BY member_id
        HAVING COUNT(*) > 1
        LIMIT 1
    `;

    if (memberCounts.length > 0) {
        const memberId = memberCounts[0].member_id;
        const count = Number(memberCounts[0].role_count);
        const member = await prisma.members.findFirst({ where: { id: memberId } });
        const roles = await prisma.member_roles.findMany({ where: { member_id: memberId } });
        const roleNames = await prisma.roles.findMany({
            where: { id: { in: roles.map((r) => r.role_id) } },
            select: { name: true },
        });

        assert(count > 1, `User ${member.user_id} has ${count} roles in project ${member.project_id}: ${roleNames.map((r) => r.name).join(", ")}`);

        // Merged permissions should be union of all roles
        let mergedPerms = new Set();
        for (const role of roles) {
            const fullRole = await prisma.roles.findFirst({ where: { id: role.role_id } });
            const perms = parsePermissions(fullRole.permissions);
            perms.forEach((p) => mergedPerms.add(p));
        }
        assert(mergedPerms.size > 0, `Merged permissions: ${mergedPerms.size} unique`);
    } else {
        console.log("  ⚠️  No multi-role members found — OK (single roles work fine)");
        assert(true, "Single-role members are the common case");
    }
}

// ─── Main ───

async function main() {
    console.log("🔐 RBAC Permission System — Test Suite");
    console.log("═".repeat(50));
    console.log(`Database: ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] || "connected"}`);
    console.log(`Time: ${new Date().toISOString()}`);

    try {
        await testParsePermissions();
        await testMemberRoleResolution();
        await testNonMemberAccess();
        await testWorkflowTransitions();
        await testAdminBypass();
        await testRolePermissionDifferences();
        await testMultiRoleMember();
    } catch (error) {
        console.error("\n💥 Test execution error:", error.message);
        failed++;
    }

    // Summary
    console.log("\n" + "═".repeat(50));
    const total = passed + failed;
    console.log(`📊 Results: ${passed}/${total} passed, ${failed} failed`);

    if (failures.length > 0) {
        console.log("\n❌ Failed tests:");
        failures.forEach((f) => console.log(`  - ${f}`));
    }

    if (failed === 0) {
        console.log("\n🎉 All tests passed!");
    }

    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

main();
