'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocale, useSwitchLocale, useT } from '@/lib/i18n';
import { LANGUAGE_NAMES, LOCALES } from '@/lib/locales';
import { CheckIcon, ChevronIcon, GlobeIcon } from './ui/icons';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const switchLocale = useSwitchLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    items.current[LOCALES.indexOf(locale)]?.focus();
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open, locale]);

  function onMenuKey(event: KeyboardEvent) {
    const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
    const last = LOCALES.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: index === last ? 0 : index + 1, ArrowUp: index === 0 ? last : index - 1, Home: 0, End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      items.current[moves[event.key]]?.focus();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button} type="button" aria-haspopup="menu" aria-expanded={open}
        aria-label={`${t('nav.language')}: ${LANGUAGE_NAMES[locale]}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); } }}
        className={`inline-flex h-10 items-center gap-1.5 rounded-[48px] bg-white px-2.5 font-display text-sm text-soft transition-colors hover:text-text ${className}`}
      >
        <GlobeIcon /> {locale.toUpperCase()} <ChevronIcon className={open ? 'rotate-180' : ''} width={12} height={12} />
      </button>
      {open && (
        <div
          role="menu" aria-label={t('nav.language')} onKeyDown={onMenuKey}
          className="absolute top-full right-0 z-50 mt-2 w-44 rounded-xl border border-line bg-white p-1 shadow-[0_8px_24px_rgb(23_22_21/0.08)]"
        >
          {LOCALES.map((code, i) => (
            <button
              key={code} ref={(el) => { items.current[i] = el; }} type="button" role="menuitemradio"
              aria-checked={code === locale} lang={code} tabIndex={-1}
              onClick={() => { switchLocale(code); setOpen(false); button.current?.focus(); }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface focus-visible:bg-surface"
            >
              {LANGUAGE_NAMES[code]}
              {code === locale && <CheckIcon className="text-valid" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
