'use client';

import { useId, useState } from 'react';
import { ChevronIcon } from '@/components/ui/icons';
import { Reveal } from '@/components/ui/Reveal';
import { useMessages, useT } from '@/lib/i18n';
import { Intro, Section } from './Section';

export function Faq() {
  const t = useT();
  const m = useMessages();
  const id = useId();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Section>
      <Reveal className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <Intro title={t('faq.title')} />
        <div className="divide-y divide-line border-y border-line">
          {m.faq.items.map((item, i) => (
            <div key={i}>
              <h3>
                <button
                  type="button" id={`${id}-q${i}`} aria-expanded={open === i} aria-controls={`${id}-a${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-normal text-text"
                >
                  {item.q}
                  <ChevronIcon className={`slide shrink-0 text-soft transition-transform duration-[900ms] ease-[cubic-bezier(0.45,0,0.15,1)] ${open === i ? 'rotate-180' : ''}`} />
                </button>
              </h3>
              <div
                id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} inert={open !== i}
                className={`slide grid transition-[grid-template-rows,opacity] duration-[900ms] ease-[cubic-bezier(0.45,0,0.15,1)] ${open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="overflow-hidden"><p className="pb-4 text-sm text-soft">{item.a}</p></div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
