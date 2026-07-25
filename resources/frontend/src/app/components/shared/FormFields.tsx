export function FInput({ label, ...rest }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <input className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow" {...rest} />
    </div>
  );
}
export function FSelect({ label, children, ...rest }: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <select className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow" {...rest}>{children}</select>
    </div>
  );
}
export function FTextarea({ label, ...rest }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      <textarea className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow" {...rest} />
    </div>
  );
}
