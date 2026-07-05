'use client'

import { useState, useCallback } from 'react'
import { SendEmailModal } from './send-email-modal'

interface PitchModalProps {
  isOpen: boolean
  onClose: () => void
  jobTitle: string
  company: string
  onSave: (pitchText: string) => Promise<void>
}

export function PitchModal({
  isOpen,
  onClose,
  jobTitle,
  company,
  onSave,
}: PitchModalProps) {
  const [pitchText, setPitchText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!pitchText) return
    try {
      await navigator.clipboard.writeText(pitchText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }, [pitchText])

  const handleSave = useCallback(async () => {
    if (!pitchText) return
    setSaving(true)
    setError(null)
    try {
      await onSave(pitchText)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save pitch'
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [pitchText, onSave, onClose])

  const handleClose = useCallback(() => {
    setPitchText(null)
    setLoading(true)
    setError(null)
    setCopied(false)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  const resumeBlurb = pitchText?.includes('---RESUME BLURB---')
    ? pitchText.split('---RESUME BLURB---')[1]?.split('---OUTREACH MESSAGE---')[0]?.trim()
    : null

  const outreachMessage = pitchText?.includes('---OUTREACH MESSAGE---')
    ? pitchText.split('---OUTREACH MESSAGE---')[1]?.trim()
    : pitchText

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">AI Pitch</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {jobTitle} at {company}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {loading && !pitchText && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-zinc-500">
                Generating pitch...
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 mb-4">
              {error}
            </div>
          )}

          {pitchText && (
            <div className="flex flex-col gap-4">
              {resumeBlurb && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    Resume Blurb
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {resumeBlurb}
                  </p>
                </div>
              )}

              <div>
                {resumeBlurb && (
                  <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    Outreach Message
                  </h3>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {outreachMessage || pitchText}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save to Tracker'}
                </button>
                <button
                  type="button"
                  onClick={() => setSendModalOpen(true)}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                >
                  Send via Gmail
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SendEmailModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        pitchText={pitchText || ''}
        company={company}
      />
    </div>
  )
}
