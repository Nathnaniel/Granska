import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import sv from '@/messages/sv.json';

export const LOCALES = ['en', 'es', 'sv', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export type Messages = typeof en;
export const MESSAGES: Record<Locale, Messages> = { en, es, sv, fr };
export const LANGUAGE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español', sv: 'Svenska', fr: 'Français' };

type Leaf<T> = T extends string ? never : {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends unknown[] ? never : `${K}.${Leaf<T[K]>}`;
}[keyof T & string];
export type MessageKey = Leaf<Messages>;

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const found = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], MESSAGES[locale]);
  const text = typeof found === 'string' ? found : key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? '')) : text;
}
