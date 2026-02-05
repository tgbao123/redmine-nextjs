import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PasswordForm } from "./password-form";

export default async function ChangePasswordPage() {
    const user = await getSession();

    if (!user) {
        redirect("/login");
    }

    return <PasswordForm />;
}
