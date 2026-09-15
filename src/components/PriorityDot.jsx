const LABEL = { high: 'High priority', medium: 'Medium priority', low: 'Low priority' }

export default function PriorityDot({ priority }) {
  return <span className={`priority-dot priority-${priority}`} title={LABEL[priority] || LABEL.medium} />
}
