import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProfileForm } from "./profile-form";

async function getUserEmail(userId: number) {
    const email = await prisma.email_addresses.findFirst({
        where: { user_id: userId, is_default: true },
    });
    return email?.address || "";
}

export default async function MyAccountPage() {
    const user = await getSession();

    if (!user) {
        redirect("/login");
    }

    const email = await getUserEmail(user.id);

    return (
        <ProfileForm
            user={{
                firstname: user.firstname,
                lastname: user.lastname,
                language: user.language,
            }}
            email={email}
        />
    );
}
