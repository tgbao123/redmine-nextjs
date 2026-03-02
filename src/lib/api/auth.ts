import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

// Authenticate via API key or session
export async function authenticateApiRequest(req: NextRequest) {
    const apiKey = req.headers.get("X-Redmine-API-Key");
    if (apiKey) {
        const token = await prisma.tokens.findFirst({ where: { value: apiKey, action: "api" } });
        if (!token) return null;
        return prisma.users.findFirst({ where: { id: token.user_id, status: 1 }, select: { id: true, login: true, admin: true, firstname: true, lastname: true } });
    }

    // Basic auth
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Basic ")) {
        const decoded = Buffer.from(auth.slice(6), "base64").toString();
        const [login, password] = decoded.split(":");
        if (login && password) {
            const user = await prisma.users.findFirst({ where: { login, status: 1 } });
            if (user) {
                const crypto = require("crypto");
                const inner = crypto.createHash("sha1").update(password).digest("hex");
                const hashed = crypto.createHash("sha1").update((user.salt || "") + inner).digest("hex");
                if (hashed === user.hashed_password) {
                    return { id: user.id, login: user.login, admin: user.admin, firstname: user.firstname, lastname: user.lastname };
                }
            }
        }
    }
    return null;
}

export function jsonError(message: string, status: number = 401) {
    return NextResponse.json({ errors: [message] }, { status });
}

export function jsonOk(data: any) {
    return NextResponse.json(data);
}
