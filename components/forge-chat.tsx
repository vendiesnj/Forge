'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Hi! I'm the Forge assistant. Ask me anything about the platform or let me know if you'd like to request a feature.",
}

export function ForgeChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [isOpen, messages])

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      const data = await response.json()

      if (response.status === 429) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: "You've sent a lot of messages! Please wait an hour before sending more.",
        }
        setMessages([...updatedMessages, assistantMessage])
        return
      }

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const assistantMessage: Message = { role: 'assistant', content: data.message }
      setMessages([...updatedMessages, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }
      setMessages([...updatedMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-20 right-4 z-50',
            'w-80 h-96',
            'flex flex-col',
            'bg-surface border border-border rounded-forge shadow-lg overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-ink">Forge Assistant</span>
            </div>
            <button
              onClick={handleClose}
              className="text-ink-muted hover:text-ink transition-colors p-1 rounded"
              aria-label="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] px-3 py-2 rounded-forge text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-ink text-bg'
                      : 'bg-bg border border-border text-ink'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-bg border border-border rounded-forge px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border bg-surface shrink-0">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                className={cn(
                  'flex-1 text-sm px-3 py-2 rounded-forge',
                  'bg-bg border border-border text-ink placeholder:text-ink-muted',
                  'focus:outline-none focus:ring-1 focus:ring-border',
                  'disabled:opacity-50'
                )}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={cn(
                  'shrink-0 p-2 rounded-forge',
                  'bg-ink text-bg',
                  'hover:opacity-80 transition-opacity',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'w-12 h-12 rounded-full',
          'bg-ink text-bg shadow-lg',
          'flex items-center justify-center',
          'hover:opacity-80 transition-opacity',
          'focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}
