import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login - Redmine",
    description: "Sign in to Redmine",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
