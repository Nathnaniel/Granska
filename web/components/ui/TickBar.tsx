// A progress bar drawn as thin ticks.
export function TickBar({ value, className = 'h-1.5' }: { value: number; className?: string }) {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="ticks absolute inset-0 text-hint" />
      <div className="ticks absolute inset-y-0 left-0 text-brand" style={{ width: `${value}%` }} />
    </div>
  );
}
