'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send via Gmail</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-700 dark:text-emerald-300 text-center">
            Email sent successfully!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>To</Label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="hiring@company.com"
                disabled={sending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Subject</Label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Message (preview)</Label>
              <div className="rounded-lg border bg-muted p-3 text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
                {pitchText}
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || !to.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
