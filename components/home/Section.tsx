import type { ReactNode } from 'react';

export function Section({ id, children, tight = false }: { id?: string; children: ReactNode; tight?: boolean }) {
  return <section id={id} className={`mx-auto max-w-[1080px] px-4 md:px-6 ${tight ? 'py-20' : 'py-24 md:py-[120px]'}`}>{children}</section>;
}

export function Intro({ title, body }: { title: string; body?: string }) {
  return (
    <div className="max-w-[620px]">
      <h2>{title}</h2>
      {body && <p className="mt-3 text-base text-soft">{body}</p>}
    </div>
  );
}
