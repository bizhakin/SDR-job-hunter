'use client'

import { useState, useCallback } from 'react'

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  pitchText: string
  company: string
}

export function SendEmailModal({
  isOpen,
  onClose,
  pitchText,
  company,
}: SendEmailModalProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(`Application: ${company}`)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      setError('Recipient email is required')
      return
    }

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          pitchText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Send failed')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }, [to, subject, pitchText])

  const handleClose = useCallback(() => {
    setTo('')
    setSubject(`Application: ${company}`)
    setSending(false)
    setError(null)
    setSent(false)
    onClose()
  }, [company, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Send via Gmail</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-300 text-center">
            Email sent successfully!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="hiring@company.com"
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                disabled={sending}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                disabled={sending}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Message (preview)</label>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 p-3 text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
                {pitchText}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !to.trim()}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
