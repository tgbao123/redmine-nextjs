"use client";

import { createContext, useContext, ReactNode } from "react";
import { getTranslations, Locale } from "@/lib/i18n";
import en from "@/lib/i18n/locales/en.json";

type Translations = typeof en;

interface I18nContextType {
    locale: Locale;
    t: Translations;
}

const I18nContext = createContext<I18nContextType>({
    locale: "en",
    t: en,
});

interface I18nProviderProps {
    children: ReactNode;
    locale: Locale | string | null;
}

export function I18nProvider({ children, locale }: I18nProviderProps) {
    const validLocale = (locale && ["en", "vi", "ja", "zh"].includes(locale) ? locale : "en") as Locale;
    const translations = getTranslations(validLocale);

    return (
        <I18nContext.Provider value={{ locale: validLocale, t: translations }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
}
