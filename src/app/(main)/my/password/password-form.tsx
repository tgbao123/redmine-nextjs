"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { changePasswordAction } from "@/lib/auth/profile-actions";
import { useI18n } from "@/components/providers/i18n-provider";

export function PasswordForm() {
    const { t } = useI18n();
    const [state, formAction, isPending] = useActionState(
        async (_prevState: { error?: string; success?: boolean } | null, formData: FormData) => {
            return await changePasswordAction(formData);
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
                    className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    {t.account.information}
                </Link>
                <Link
                    href="/my/password"
                    className="pb-2 text-sm font-medium border-b-2 border-primary text-primary"
                >
                    {t.account.changePassword}
                </Link>
            </div>

            <Card className="max-w-lg">
                <CardHeader>
                    <CardTitle>{t.account.changePassword}</CardTitle>
                </CardHeader>
                <CardContent>
                    {state?.success && (
                        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                            {t.account.passwordChanged}
                        </div>
                    )}
                    {state?.error && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                            {state.error}
                        </div>
                    )}
                    <form action={formAction} className="space-y-4">
                        <div className="grid gap-2">
                            <label htmlFor="current_password" className="text-sm font-medium">
                                {t.account.currentPassword} <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="current_password"
                                name="current_password"
                                type="password"
                                required
                                placeholder={t.account.passwordPlaceholder}
                            />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="new_password" className="text-sm font-medium">
                                {t.account.newPassword} <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="new_password"
                                name="new_password"
                                type="password"
                                required
                                placeholder={t.account.newPasswordPlaceholder}
                            />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="confirm_password" className="text-sm font-medium">
                                {t.account.confirmPassword} <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="confirm_password"
                                name="confirm_password"
                                type="password"
                                required
                                placeholder={t.account.confirmPasswordPlaceholder}
                            />
                        </div>

                        <div className="pt-4">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? t.common.loading : t.account.changePassword}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
