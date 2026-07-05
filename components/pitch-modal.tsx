'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
  const [resumeBlurb, setResumeBlurb] = useState<string | null>(null)
  const [outreachMessage, setOutreachMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)

  const resetState = useCallback(() => {
    setPitchText(null)
    setResumeBlurb(null)
    setOutreachMessage(null)
    setLoading(true)
    setSaving(false)
    setError(null)
    setCopied(false)
    setSendModalOpen(false)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

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
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pitch')
    } finally {
      setSaving(false)
    }
  }, [pitchText, onSave, handleClose])

  // Fetch pitch from store ref when modal opens
  useState(() => {
    if (isOpen) {
      setLoading(true)
      const checkPitch = setInterval(() => {
        const stored = (window as unknown as Record<string, string | null>).__pitchText
        if (stored) {
          setPitchText(stored)
          setLoading(false)
          clearInterval(checkPitch)

          const blurbMatch = stored.match(/---RESUME BLURB---\n?([\s\S]*?)\n?---OUTREACH MESSAGE---/)
          const messageMatch = stored.match(/---OUTREACH MESSAGE---\n?([\s\S]*)/)

          if (blurbMatch) setResumeBlurb(blurbMatch[1].trim())
          if (messageMatch) setOutreachMessage(messageMatch[1].trim())
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkPitch)
        if (!(window as unknown as Record<string, string | null>).__pitchText) {
          setLoading(false)
        }
      }, 10000)
    }
  })

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {jobTitle}
            </DialogTitle>
            <DialogDescription>
              {company}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pitchText ? (
            <div className="flex flex-col gap-4">
              {resumeBlurb && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Resume Blurb
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted rounded-lg p-3">
                    {resumeBlurb}
                  </p>
                </div>
              )}

              <div>
                {resumeBlurb && (
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Outreach Message
                  </h3>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted rounded-lg p-3">
                  {outreachMessage || pitchText}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save to Tracker'}
                </Button>
                <Button
                  variant="default"
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => setSendModalOpen(true)}
                >
                  Send via Gmail
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No pitch generated. Try again from the dashboard.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
