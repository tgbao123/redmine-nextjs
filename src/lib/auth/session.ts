import { prisma } from "@/lib/db/prisma";
import { verifyPassword, generateSessionToken } from "./password";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "redmine_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
    id: number;
    login: string;
    firstname: string;
    lastname: string;
    admin: boolean;
    status: number;
    language: string | null;
}

export async function login(
    loginOrEmail: string,
    password: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
    try {
        // First try to find by login
        let user = await prisma.users.findFirst({
            where: {
                login: loginOrEmail,
                status: 1, // Active users only
                type: "User", // Exclude groups
            },
        });

        // If not found by login, try by email
        if (!user) {
            const emailRecord = await prisma.email_addresses.findFirst({
                where: {
                    address: loginOrEmail,
                    is_default: true,
                },
            });

            if (emailRecord) {
                user = await prisma.users.findFirst({
                    where: {
                        id: emailRecord.user_id,
                        status: 1,
                        type: "User",
                    },
                });
            }
        }

        if (!user) {
            return { success: false, error: "Invalid login or password" };
        }

        // Verify password
        if (!user.salt || !verifyPassword(password, user.hashed_password, user.salt)) {
            return { success: false, error: "Invalid login or password" };
        }

        // Create session token
        const token = generateSessionToken();
        const now = new Date();

        console.log("[login] Creating token:", token.substring(0, 10) + "...");

        // Store token in database
        await prisma.tokens.create({
            data: {
                user_id: user.id,
                action: "session",
                value: token,
                created_on: now,
                updated_on: now,
            },
        });

        // Update last login
        await prisma.users.update({
            where: { id: user.id },
            data: { last_login_on: now },
        });

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: SESSION_MAX_AGE,
            path: "/",
        });

        return {
            success: true,
            user: {
                id: user.id,
                login: user.login,
                firstname: user.firstname,
                lastname: user.lastname,
                admin: user.admin,
                status: user.status,
                language: user.language,
            },
        };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "An error occurred during login" };
    }
}

export async function logout(): Promise<void> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
        // Remove token from database
        await prisma.tokens.deleteMany({
            where: { value: token, action: "session" },
        });

        // Clear cookie
        cookieStore.delete(SESSION_COOKIE_NAME);
    }
}

export async function getSession(): Promise<SessionUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

        console.log("[getSession] Cookie token:", token ? token.substring(0, 10) + "..." : "null");

        if (!token) {
            return null;
        }

        // Find token in database
        const tokenRecord = await prisma.tokens.findFirst({
            where: {
                value: token,
                action: "session",
            },
        });

        console.log("[getSession] Token record:", tokenRecord ? `Found user_id=${tokenRecord.user_id}` : "NOT FOUND");

        if (!tokenRecord) {
            return null;
        }

        // Check if token is expired (7 days)
        const tokenAge = Date.now() - tokenRecord.created_on.getTime();
        if (tokenAge > SESSION_MAX_AGE * 1000) {
            await prisma.tokens.delete({ where: { id: tokenRecord.id } });
            return null;
        }

        // Get user
        const user = await prisma.users.findFirst({
            where: {
                id: tokenRecord.user_id,
                status: 1,
                type: "User",
            },
        });

        console.log("[getSession] User:", user ? `${user.firstname} ${user.lastname} (${user.login})` : "NOT FOUND");

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            login: user.login,
            firstname: user.firstname,
            lastname: user.lastname,
            admin: user.admin,
            status: user.status,
            language: user.language,
        };
    } catch (error) {
        console.error("Get session error:", error);
        return null;
    }
}

export async function requireAuth(): Promise<SessionUser> {
    const user = await getSession();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}
