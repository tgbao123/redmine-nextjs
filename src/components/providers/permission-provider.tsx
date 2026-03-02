"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Permission context for client-side permission-aware UI rendering.
 * Permissions are resolved server-side and passed as a string array.
 */
interface PermissionContextValue {
    /** Set of permission strings the current user has in the current project */
    permissions: Set<string>;
    /** Whether the user is a global admin */
    isAdmin: boolean;
    /** Check if user has a specific permission */
    can: (permission: string) => boolean;
    /** Check if user has any of the given permissions */
    canAny: (...permissions: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
    permissions: new Set(),
    isAdmin: false,
    can: () => false,
    canAny: () => false,
});

interface PermissionProviderProps {
    children: ReactNode;
    /** Permission strings resolved server-side */
    permissions: string[];
    /** Whether user is admin */
    isAdmin: boolean;
}

export function PermissionProvider({
    children,
    permissions: permissionsList,
    isAdmin,
}: PermissionProviderProps) {
    const value = useMemo(() => {
        const permissions = new Set(permissionsList);

        return {
            permissions,
            isAdmin,
            can: (permission: string) => isAdmin || permissions.has(permission),
            canAny: (...perms: string[]) =>
                isAdmin || perms.some((p) => permissions.has(p)),
        };
    }, [permissionsList, isAdmin]);

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

/**
 * Hook to check permissions in client components.
 *
 * Usage:
 * ```tsx
 * const { can } = usePermission();
 * if (can("add_issues")) { ... }
 * ```
 */
export function usePermission() {
    return useContext(PermissionContext);
}
