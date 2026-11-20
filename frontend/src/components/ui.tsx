import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, LoaderCircle } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-heading">
    <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div className="page-action">{action}</div>}
  </header>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'panel ' + className}>{children}</section>
}

export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button type={type} className={'button button-' + variant + ' ' + className} {...props}>{children}</button>
}

export function Field({ label, hint, id: providedId, 'aria-describedby': describedBy, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const hintId = hint ? id + '-hint' : undefined
  return <label className="field" htmlFor={id}>
    <span>{label}</span>
    <input id={id} aria-describedby={describedBy ?? hintId} {...props} />
    {hint && <small id={hintId}>{hint}</small>}
  </label>
}

export function SelectField({ label, children, id: providedId, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  return <label className="field" htmlFor={id}><span>{label}</span><select id={id} {...props}>{children}</select></label>
}

export function Metric({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: string; icon?: ReactNode }) {
  return <div className="metric-card">
    <div className="metric-top"><span>{label}</span>{icon && <span className="metric-icon" aria-hidden="true">{icon}</span>}</div>
    <strong>{value}</strong>{detail && <small>{detail}</small>}
  </div>
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return <div className="notice notice-error" role="alert"><AlertCircle size={17} aria-hidden="true" /><span>{children}</span></div>
}

export function LoadError({ message, onRetry, retryLabel = 'Retry loading data' }: { message: string; onRetry: () => void; retryLabel?: string }) {
  return <div className="load-error">
    <ErrorNotice>{message}</ErrorNotice>
    <Button variant="secondary" onClick={() => onRetry()}>{retryLabel}</Button>
  </div>
}

export function InfoNotice({ children }: { children: ReactNode }) {
  return <div className="notice notice-info" role="note">{children}</div>
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <div className="empty-state" role="status"><div className="empty-dot" aria-hidden="true" /><strong>{title}</strong>{detail && <span>{detail}</span>}</div>
}

export function Loading({ label = 'Loading data' }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><LoaderCircle className="spin" size={22} aria-hidden="true" /><span>{label}</span></div>
}

export function StatusPill({ status }: { status: string }) {
  return <span className={'status-pill status-' + status.toLowerCase()} aria-label={'Status: ' + status}>{status}</span>
}

export function AlgorithmChecks({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return <div className="algorithm-checks" role="group" aria-label="Algorithm or policy choices">
    {options.map(option => <label className="check-chip" key={option}>
      <input type="checkbox" checked={selected.includes(option)} onChange={event => onChange(event.target.checked ? [...selected, option] : selected.filter(value => value !== option))} />
      <span>{option}</span>
    </label>)}
  </div>
}

export function TableFrame({ children, minWidth = 620 }: { children: ReactNode; minWidth?: number }) {
  return <div className="table-wrap" style={{ minWidth: 0 }} role="region" aria-label="Scrollable data table" tabIndex={0}>
    <table style={{ minWidth }}>{children}</table>
  </div>
}

