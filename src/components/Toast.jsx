export default function Toast({ toast, onDismiss }) {
  if (!toast) return null
  return (
    <div className="toast" role="status" onClick={onDismiss}>
      <i className="ph ph-bell-ringing" />
      <span>{toast.text}</span>
    </div>
  )
}
