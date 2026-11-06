'use client';

import { useRef, type KeyboardEvent } from 'react';

export function Tabs<T extends string>({ label, tabs, value, onChange }: {
  label: string; tabs: { id: T; label: string }[]; value: T; onChange: (next: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = (tabs.findIndex((tab) => tab.id === value) + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="inline-grid auto-cols-fr grid-flow-col rounded-3xl border border-line p-1">
      {tabs.map((tab, i) => (
        <button
          key={tab.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" aria-selected={value === tab.id}
          tabIndex={value === tab.id ? 0 : -1} onClick={() => onChange(tab.id)}
          className={`h-9 min-w-[120px] rounded-[48px] px-3 text-sm whitespace-nowrap transition-colors ${value === tab.id ? 'bg-idle text-ink' : 'text-soft'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
