import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

type Toast = { id: number; message: string; kind: 'success' | 'error' }
const ToastContext = createContext<(message: string, kind?: Toast['kind']) => void>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = (message: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(list => [...list, { id, message, kind }])
    window.setTimeout(() => setToasts(list => list.filter(toast => toast.id !== id)), 4200)
  }
  const value = useMemo(() => push, [])
  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-stack">
      {toasts.map(toast => <div
        className={'toast toast-' + toast.kind}
        key={toast.id}
        role={toast.kind === 'error' ? 'alert' : 'status'}
        aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
      >
        {toast.kind === 'error' ? <AlertCircle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
        <span>{toast.message}</span>
        <button aria-label="Dismiss notification" onClick={() => setToasts(list => list.filter(item => item.id !== toast.id))}><X size={15} aria-hidden="true" /></button>
      </div>)}
    </div>
  </ToastContext.Provider>
}

export function useToast() { return useContext(ToastContext) }

