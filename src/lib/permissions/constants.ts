/**
 * Redmine 3.4.5 Permission Constants
 * Extracted from the roles.permissions YAML field in the database.
 */

// All known Redmine permissions
export const Permission = {
    // Project
    ADD_PROJECT: "add_project",
    EDIT_PROJECT: "edit_project",
    CLOSE_PROJECT: "close_project",
    SELECT_PROJECT_MODULES: "select_project_modules",
    MANAGE_MEMBERS: "manage_members",
    MANAGE_VERSIONS: "manage_versions",
    ADD_SUBPROJECTS: "add_subprojects",
    MANAGE_CATEGORIES: "manage_categories",
    MANAGE_PROJECT_ACTIVITIES: "manage_project_activities",

    // Issues
    VIEW_ISSUES: "view_issues",
    ADD_ISSUES: "add_issues",
    EDIT_ISSUES: "edit_issues",
    EDIT_OWN_ISSUES: "edit_own_issues",
    COPY_ISSUES: "copy_issues",
    DELETE_ISSUES: "delete_issues",
    MANAGE_ISSUE_RELATIONS: "manage_issue_relations",
    MANAGE_SUBTASKS: "manage_subtasks",
    SET_ISSUES_PRIVATE: "set_issues_private",
    SET_OWN_ISSUES_PRIVATE: "set_own_issues_private",
    ADD_ISSUE_NOTES: "add_issue_notes",
    EDIT_ISSUE_NOTES: "edit_issue_notes",
    EDIT_OWN_ISSUE_NOTES: "edit_own_issue_notes",
    VIEW_PRIVATE_NOTES: "view_private_notes",
    SET_NOTES_PRIVATE: "set_notes_private",
    VIEW_ISSUE_WATCHERS: "view_issue_watchers",
    ADD_ISSUE_WATCHERS: "add_issue_watchers",
    DELETE_ISSUE_WATCHERS: "delete_issue_watchers",
    IMPORT_ISSUES: "import_issues",

    // Time tracking
    VIEW_TIME_ENTRIES: "view_time_entries",
    LOG_TIME: "log_time",
    EDIT_TIME_ENTRIES: "edit_time_entries",
    EDIT_OWN_TIME_ENTRIES: "edit_own_time_entries",

    // News
    VIEW_NEWS: "view_news",
    MANAGE_NEWS: "manage_news",
    COMMENT_NEWS: "comment_news",

    // Documents
    VIEW_DOCUMENTS: "view_documents",
    ADD_DOCUMENTS: "add_documents",
    EDIT_DOCUMENTS: "edit_documents",
    DELETE_DOCUMENTS: "delete_documents",

    // Files
    VIEW_FILES: "view_files",
    MANAGE_FILES: "manage_files",

    // Wiki
    VIEW_WIKI_PAGES: "view_wiki_pages",
    VIEW_WIKI_EDITS: "view_wiki_edits",
    EXPORT_WIKI_PAGES: "export_wiki_pages",
    EDIT_WIKI_PAGES: "edit_wiki_pages",
    RENAME_WIKI_PAGES: "rename_wiki_pages",
    DELETE_WIKI_PAGES: "delete_wiki_pages",
    DELETE_WIKI_PAGES_ATTACHMENTS: "delete_wiki_pages_attachments",
    PROTECT_WIKI_PAGES: "protect_wiki_pages",
    MANAGE_WIKI: "manage_wiki",

    // Forums
    VIEW_MESSAGES: "view_messages",
    ADD_MESSAGES: "add_messages",
    EDIT_MESSAGES: "edit_messages",
    EDIT_OWN_MESSAGES: "edit_own_messages",
    DELETE_MESSAGES: "delete_messages",
    DELETE_OWN_MESSAGES: "delete_own_messages",
    MANAGE_BOARDS: "manage_boards",

    // Repository
    VIEW_CHANGESETS: "view_changesets",
    BROWSE_REPOSITORY: "browse_repository",
    COMMIT_ACCESS: "commit_access",
    MANAGE_RELATED_ISSUES: "manage_related_issues",
    MANAGE_REPOSITORY: "manage_repository",

    // Calendar & Gantt
    VIEW_CALENDAR: "view_calendar",
    VIEW_GANTT: "view_gantt",

    // Queries
    SAVE_QUERIES: "save_queries",
    MANAGE_PUBLIC_QUERIES: "manage_public_queries",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

/**
 * Builtin role IDs as stored in the database.
 */
export const BUILTIN_ROLE = {
    NON_MEMBER: 1,
    ANONYMOUS: 2,
} as const;

/**
 * Parse the YAML-serialized permissions string from roles.permissions.
 * Format: "---\n- :permission_name\n- :another_permission\n"
 */
export function parsePermissions(yamlStr: string | null): Set<string> {
    if (!yamlStr) return new Set();

    const permissions = new Set<string>();
    const lines = yamlStr.split("\n");

    for (const line of lines) {
        const trimmed = line.trim();
        // Match lines like "- :view_issues"
        if (trimmed.startsWith("- :")) {
            permissions.add(trimmed.substring(3));
        }
    }

    return permissions;
}
