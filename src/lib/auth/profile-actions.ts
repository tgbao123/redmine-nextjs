"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "./session";
import { hashPassword, verifyPassword } from "./password";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
    const user = await getSession();
    if (!user) {
        return { error: "Not authenticated" };
    }

    const firstname = formData.get("firstname") as string;
    const lastname = formData.get("lastname") as string;
    const email = formData.get("email") as string;
    const language = formData.get("language") as string;

    if (!firstname || !lastname || !email) {
        return { error: "All fields are required" };
    }

    try {
        // Update user
        await prisma.users.update({
            where: { id: user.id },
            data: {
                firstname,
                lastname,
                language,
                updated_on: new Date(),
            },
        });

        // Update email
        await prisma.email_addresses.updateMany({
            where: { user_id: user.id, is_default: true },
            data: { address: email, updated_on: new Date() },
        });

        revalidatePath("/my/account");
        return { success: true };
    } catch (error) {
        console.error("Update profile error:", error);
        return { error: "Failed to update profile" };
    }
}

export async function changePasswordAction(formData: FormData) {
    const user = await getSession();
    if (!user) {
        return { error: "Not authenticated" };
    }

    const currentPassword = formData.get("current_password") as string;
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: "All fields are required" };
    }

    if (newPassword !== confirmPassword) {
        return { error: "New passwords do not match" };
    }

    if (newPassword.length < 8) {
        return { error: "Password must be at least 8 characters" };
    }

    try {
        // Get full user with password
        const dbUser = await prisma.users.findUnique({
            where: { id: user.id },
        });

        if (!dbUser || !dbUser.salt) {
            return { error: "User not found" };
        }

        // Verify current password
        if (!verifyPassword(currentPassword, dbUser.hashed_password, dbUser.salt)) {
            return { error: "Current password is incorrect" };
        }

        // Hash new password
        const newHashedPassword = hashPassword(newPassword, dbUser.salt);

        // Update password
        await prisma.users.update({
            where: { id: user.id },
            data: {
                hashed_password: newHashedPassword,
                passwd_changed_on: new Date(),
                updated_on: new Date(),
            },
        });

        revalidatePath("/my/password");
        return { success: true };
    } catch (error) {
        console.error("Change password error:", error);
        return { error: "Failed to change password" };
    }
}
