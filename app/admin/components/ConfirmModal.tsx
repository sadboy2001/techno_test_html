'use client'

type ConfirmModalProps = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({ title, message, confirmLabel = 'Удалить', cancelLabel = 'Отмена', danger = false, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, width: 420, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{title}</h2>
        <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 7, border: '1px solid #2a2a2a',
            background: '#1e1e1e', color: '#aaa', cursor: 'pointer', fontSize: 13,
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding: '8px 18px', borderRadius: 7, border: danger ? '1px solid #4a1a1a' : '1px solid #2a2a2a',
            background: danger ? '#2a0f0f' : '#62a54b', color: danger ? '#f87171' : '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
