import { useEffect, useMemo, useState } from 'react'
import { buildExportText, downloadTextFile } from '../utils/export.js'

export default function ExportModal({ open, courses, todayEntries, onClose }) {
  const [copied, setCopied] = useState(false)
  const text = useMemo(() => (open ? buildExportText(courses, todayEntries) : ''), [open, courses, todayEntries])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* Clipboard API unavailable/blocked — the textarea below can still be selected and copied manually. */
    }
  }

  function handleDownload() {
    downloadTextFile('course-planner-export.txt', text)
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Export planner</div>
        <p className="dialog-body">All courses, tasks, due dates, and priorities as plain text — ready to copy or share.</p>
        <textarea className="input export-textarea" value={text} readOnly onFocus={(e) => e.target.select()} />
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-secondary" onClick={handleCopy}>
            <i className="ph ph-copy" /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="btn btn-primary" onClick={handleDownload}>
            <i className="ph ph-download-simple" /> Download .txt
          </button>
        </div>
      </div>
    </div>
  )
}
