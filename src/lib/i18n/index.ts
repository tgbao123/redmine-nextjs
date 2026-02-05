import en from "./locales/en.json";
import vi from "./locales/vi.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";

export type Locale = "en" | "vi" | "ja" | "zh";

export const locales: Record<Locale, typeof en> = {
    en,
    vi,
    ja,
    zh,
};

export const localeNames: Record<Locale, string> = {
    en: "English",
    vi: "Tiếng Việt",
    ja: "日本語",
    zh: "中文",
};

export function getTranslations(locale: Locale | string | null) {
    const validLocale = (locale && locale in locales ? locale : "en") as Locale;
    return locales[validLocale];
}

export function t(
    translations: typeof en,
    key: string
): string {
    const keys = key.split(".");
    let result: unknown = translations;

    for (const k of keys) {
        if (result && typeof result === "object" && k in result) {
            result = (result as Record<string, unknown>)[k];
        } else {
            return key; // Return key if translation not found
        }
    }

    return typeof result === "string" ? result : key;
}

export const defaultLocale: Locale = "en";
