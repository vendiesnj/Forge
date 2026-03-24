'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

interface Conversation {
  id: string
  builder_id: string
  participant_id: string
  project_id: string | null
  subject: string | null
  status: string
  created_at: string
  updated_at: string
  last_message: Message | null
  unread_count: number
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function MessagesInner() {
  const searchParams = useSearchParams()
  const { userId } = useAuth()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [composing, setComposing] = useState(false)
  const [composeBuilder, setComposeBuilder] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeMessage, setComposeMessage] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } catch {
      // silent
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch {
      setError('Failed to load messages')
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    const convParam = searchParams.get('conversation')
    const builderParam = searchParams.get('builder')
    if (convParam) {
      setSelectedId(convParam)
    } else if (builderParam) {
      setComposing(true)
      setComposeBuilder(builderParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    fetchMessages(selectedId)
  }, [selectedId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchConversations()
      if (selectedId) fetchMessages(selectedId)
    }, 15000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedId, fetchConversations, fetchMessages])

  const sendMessage = async () => {
    if (!input.trim() || !selectedId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to send')
        return
      }
      const data = await res.json()
      setMessages((prev) => [...prev, data.message])
      setInput('')
      fetchConversations()
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startCompose = async () => {
    if (!composeMessage.trim() || !composeBuilder.trim()) {
      setComposeError('Builder ID and message are required')
      return
    }
    setComposeSending(true)
    setComposeError(null)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          builder_id: composeBuilder.trim(),
          project_id: null,
          subject: composeSubject.trim() || null,
          initial_message: composeMessage.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setComposeError(data.error ?? 'Failed to start conversation')
        return
      }
      setComposing(false)
      setComposeBuilder('')
      setComposeSubject('')
      setComposeMessage('')
      await fetchConversations()
      setSelectedId(data.conversation.id)
    } finally {
      setComposeSending(false)
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedId)
  const otherParty = (conv: Conversation) =>
    conv.builder_id === userId ? conv.participant_id : conv.builder_id

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border bg-surface shrink-0">
        <h1 className="text-base font-semibold text-ink">Messages</h1>
        <p className="text-xs text-ink4 mt-0.5">Conversations with builders</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — conversation list */}
        <aside className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink4">Inbox</span>
            <button
              onClick={() => { setComposing(true); setSelectedId(null) }}
              className="text-xs text-ink3 hover:text-ink transition-colors px-2 py-1 rounded-forge hover:bg-surface2"
            >
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-4 h-4 border-2 border-border border-t-ink3 rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-ink4">No conversations yet</p>
                <button
                  onClick={() => setComposing(true)}
                  className="mt-3 text-xs text-ink3 hover:text-ink underline transition-colors"
                >
                  Message a builder
                </button>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setSelectedId(conv.id); setComposing(false) }}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border transition-colors',
                    selectedId === conv.id ? 'bg-surface2' : 'hover:bg-surface2'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-ink truncate">
                      {conv.subject ?? `With ${otherParty(conv).slice(0, 8)}…`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.unread_count > 0 && (
                        <span className="bg-ink text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                      {conv.last_message && (
                        <span className="text-[10px] text-ink4">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  {conv.last_message && (
                    <p className="text-xs text-ink4 truncate">{conv.last_message.content}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right panel — thread or compose */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {composing ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-ink">New Message</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1">Builder User ID</label>
                  <input
                    value={composeBuilder}
                    onChange={(e) => setComposeBuilder(e.target.value)}
                    placeholder="Paste the builder's Clerk user ID…"
                    className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                  <p className="text-[10px] text-ink4 mt-1">Find the builder's ID on their public profile page.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1">Subject (optional)</label>
                  <input
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="What's this about?"
                    className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink3 mb-1">Message</label>
                  <textarea
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    placeholder="Introduce yourself and describe what you're looking for…"
                    rows={6}
                    className="w-full text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
                  />
                </div>
                {composeError && <p className="text-xs text-red-500">{composeError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={startCompose}
                    disabled={composeSending}
                    className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50"
                  >
                    {composeSending ? 'Sending…' : 'Send Message'}
                  </button>
                  <button
                    onClick={() => { setComposing(false); setComposeError(null) }}
                    className="px-4 py-2 border border-border text-sm text-ink3 rounded-forge hover:text-ink hover:border-border2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedId && selectedConv ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-border shrink-0">
                <h2 className="text-sm font-semibold text-ink">
                  {selectedConv.subject ?? 'Conversation'}
                </h2>
                <p className="text-xs text-ink4 mt-0.5">
                  With {otherParty(selectedConv)}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-4 h-4 border-2 border-border border-t-ink3 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-ink4">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === userId
                    return (
                      <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[70%] rounded-forge px-3 py-2',
                            isMine ? 'bg-ink text-white' : 'bg-surface2 text-ink border border-border'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={cn('text-[10px] mt-1', isMine ? 'text-white/60' : 'text-ink4')}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {error && (
                <div className="px-6 py-2">
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}

              <div className="px-6 py-4 border-t border-border shrink-0">
                <div className="flex items-end gap-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    rows={2}
                    className="flex-1 text-sm bg-surface2 border border-border rounded-forge px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-border2 resize-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {sending ? '…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-12 h-12 bg-surface2 rounded-forge flex items-center justify-center">
                <svg className="w-6 h-6 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <p className="text-sm text-ink4">Select a conversation or message a builder</p>
              <button
                onClick={() => setComposing(true)}
                className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-forge hover:bg-ink2 transition-colors"
              >
                New Message
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function OrgMessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-border border-t-ink3 rounded-full animate-spin" /></div>}>
      <MessagesInner />
    </Suspense>
  )
}
