import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/auth/session";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getSession();

    return (
        <I18nProvider locale={user?.language || "en"}>
            <div className="flex min-h-screen">
                <Sidebar user={user} />
                <div className="flex-1 pl-64">
                    <Header />
                    <main className="p-6">{children}</main>
                </div>
            </div>
        </I18nProvider>
    );
}
