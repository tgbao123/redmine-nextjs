"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { updateProfileAction } from "@/lib/auth/profile-actions";
import { useI18n } from "@/components/providers/i18n-provider";
import { localeNames, Locale } from "@/lib/i18n";

interface ProfileFormProps {
    user: {
        firstname: string;
        lastname: string;
        language: string | null;
    };
    email: string;
}

export function ProfileForm({ user, email }: ProfileFormProps) {
    const { t, locale } = useI18n();
    const [state, formAction, isPending] = useActionState(
        async (_prevState: { error?: string; success?: boolean } | null, formData: FormData) => {
            return await updateProfileAction(formData);
        },
        null
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t.account.title}</h1>
                <p className="text-muted-foreground">
                    {t.account.subtitle}
                </p>
            </div>

            {/* Navigation tabs */}
            <div className="flex gap-4 border-b">
                <Link
                    href="/my/account"
                    className="pb-2 text-sm font-medium border-b-2 border-primary text-primary"
                >
                    {t.account.information}
                </Link>
                <Link
                    href="/my/password"
                    className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    {t.account.changePassword}
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t.account.information}</CardTitle>
                </CardHeader>
                <CardContent>
                    {state?.success && (
                        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                            {t.account.profileUpdated}
                        </div>
                    )}
                    {state?.error && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                            {state.error}
                        </div>
                    )}
                    <form action={formAction} className="space-y-4">
                        <div className="grid gap-2">
                            <label htmlFor="firstname" className="text-sm font-medium">
                                {t.account.firstName} <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="firstname"
                                name="firstname"
                                defaultValue={user.firstname}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="lastname" className="text-sm font-medium">
                                {t.account.lastName} <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="lastname"
                                name="lastname"
                                defaultValue={user.lastname}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                {t.account.email} <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={email}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="language" className="text-sm font-medium">
                                {t.account.language}
                            </label>
                            <select
                                id="language"
                                name="language"
                                defaultValue={locale}
                                key={locale}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {(Object.keys(localeNames) as Locale[]).map((locale) => (
                                    <option key={locale} value={locale}>
                                        {localeNames[locale]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? t.common.loading : t.common.save}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
