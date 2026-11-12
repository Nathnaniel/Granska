import type { InputHTMLAttributes, Ref } from 'react';

export function EmailField({ id, label, inputRef, ...rest }:
  { id: string; label: string; inputRef?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-display text-sm leading-4 text-text">{label}</label>
      <div className="flex h-[42px] items-center gap-1 rounded-lg border border-transparent bg-surface px-[13px] transition-colors focus-within:border-brand has-aria-invalid:border-invalid">
        <img src="/icons/mail.svg" width={14} height={14} alt="" className="shrink-0" />
        <input
          ref={inputRef} id={id} type="email" inputMode="email" autoCapitalize="off" spellCheck={false}
          className="h-full w-full min-w-0 bg-transparent font-display text-base text-text outline-none sm:text-xs placeholder:text-faint"
          {...rest}
        />
      </div>
    </div>
  );
}
