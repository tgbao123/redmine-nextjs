"use server";

import { login, logout } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function loginAction(
    prevState: { error?: string } | null,
    formData: FormData
) {
    const loginOrEmail = formData.get("login") as string;
    const password = formData.get("password") as string;

    if (!loginOrEmail || !password) {
        return { error: "Please enter login and password" };
    }

    const result = await login(loginOrEmail, password);

    if (!result.success) {
        return { error: result.error };
    }

    redirect("/");
}

export async function logoutAction() {
    await logout();
    redirect("/login");
}
