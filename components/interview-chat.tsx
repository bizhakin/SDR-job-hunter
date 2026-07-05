'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatMessage {
  role: 'hiring_manager' | 'candidate'
  content: string
}

interface InterviewChatProps {
  sessionId: string
  initialMessages: ChatMessage[]
  onScore: (result: ScoreResult) => void
  onError: (error: string) => void
}

interface ScoreResult {
  score: number
  breakdown: {
    objection_handling: number
    structure: number
    closing_ability: number
    composure: number
  }
  strengths: string
  weaknesses: string
  objections_drilled: string[]
}

export function InterviewChat({
  sessionId,
  initialMessages,
  onScore,
  onError,
}: InterviewChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [scoring, setScoring] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    setMessages((prev) => [...prev, { role: 'candidate', content: userMessage }])

    try {
      const response = await fetch('/api/interview/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMessage }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Reply failed')
      }

      setMessages((prev) => [
        ...prev,
        { role: 'hiring_manager', content: data.message },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      onError(message)
    } finally {
      setSending(false)
    }
  }, [input, sending, sessionId, onError])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleScore = useCallback(async () => {
    setScoring(true)
    try {
      const response = await fetch('/api/interview/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Scoring failed')
      }

      onScore(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scoring failed'
      onError(message)
    } finally {
      setScoring(false)
    }
  }, [sessionId, onScore, onError])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'candidate'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground italic">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4 flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer..."
          disabled={sending || scoring}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || sending || scoring}
        >
          Send
        </Button>
        <Button
          variant="secondary"
          onClick={handleScore}
          disabled={scoring || sending || messages.length < 2}
        >
          {scoring ? 'Scoring...' : 'End & Score'}
        </Button>
      </div>
    </div>
  )
}
