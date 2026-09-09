export function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className={`animate-spin rounded-full border-2 border-[#EDC8C8] border-t-[#BD1E1E] ${className}`} />
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-semibold transition min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#D66464] disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-[#BD1E1E] text-white hover:bg-[#A01111] shadow-sm active:bg-[#850C0C]',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100',
    success: 'bg-white text-black border border-black hover:bg-neutral-100 active:bg-neutral-200',
    danger: 'bg-black text-white hover:bg-neutral-800 active:bg-neutral-900',
    ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <input
        className={`w-full rounded-sm border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#D66464] focus:outline-none focus:ring-2 focus:ring-[#F6E0E0] sm:text-sm ${className}`}
        {...props}
      />
    </label>
  )
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <textarea
        className={`w-full rounded-sm border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#D66464] focus:outline-none focus:ring-2 focus:ring-[#F6E0E0] sm:text-sm ${className}`}
        {...props}
      />
    </label>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-sm border border-slate-100 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-[#F6E0E0] text-[#A01111]',
    rose: 'bg-neutral-900 text-white',
    amber: 'bg-white text-neutral-700 border border-neutral-200',
    violet: 'bg-[#F6E0E0] text-[#A01111]',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  )
}
