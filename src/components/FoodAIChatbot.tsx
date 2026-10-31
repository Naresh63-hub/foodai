import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendChatMessage } from '../api/food'
import { useUserPreferences } from '../hooks/useUserPreferences'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  suggestions?: string[]
  timestamp: string
}

const DEFAULT_SUGGESTIONS = [
  '🍱 How to analyze my plate?',
  '🍎 Healthy snacks under 150 kcal',
  '💪 High protein food ideas',
  '🩸 Low glycemic index foods',
  '📊 What are WHO daily limits?',
  '🥗 Balanced dinner under 450 kcal',
]

export default function FoodAIChatbot() {
  const navigate = useNavigate()
  const { values: userPrefs } = useUserPreferences()

  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hi! I'm your **FoodAI Nutrition Assistant**.\n\nAsk me anything about food calories, macros, healthy meal ideas, or how to use FoodAI features (like **Plate Recognition** or **Barcode Scanning**)!",
      suggestions: DEFAULT_SUGGESTIONS.slice(0, 3),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, loading])

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await sendChatMessage({
        message: query,
        health_conditions: userPrefs?.conditions,
        age: userPrefs?.age ? parseInt(userPrefs.age, 10) : undefined,
        weight_kg: userPrefs?.weight ? parseFloat(userPrefs.weight) : undefined,
      })

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        suggestions: response.suggestions && response.suggestions.length > 0 ? response.suggestions : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, botMsg])
    } catch {
      const errorMsg: Message = {
        id: `bot-err-${Date.now()}`,
        sender: 'assistant',
        text: "I couldn't reach the server right now, but feel free to explore **[Analyze My Plate](/analyze-plate)** or **[Daily Tracker](/tracker)** for your meal tracking!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: "Conversation cleared. How can I assist your nutrition journey today?",
        suggestions: DEFAULT_SUGGESTIONS.slice(0, 3),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  // Render markdown bold and links smoothly
  const renderFormattedText = (text: string) => {
    // Replace markdown links [label](url) with clickable buttons
    const linkRegex = /\[(.*?)\]\((.*?)\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      const label = match[1]
      const url = match[2]
      parts.push(
        <button
          key={`link-${match.index}`}
          type="button"
          onClick={() => {
            setIsOpen(false)
            navigate(url)
          }}
          className="inline-flex items-center text-emerald-700 font-bold underline hover:text-emerald-900 mx-0.5"
        >
          {label}
        </button>,
      )
      lastIndex = linkRegex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return (
      <div className="whitespace-pre-line text-xs leading-relaxed space-y-1">
        {parts.map((p, i) =>
          typeof p === 'string' ? (
            <span key={i} dangerouslySetInnerHTML={{
              __html: p
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>'),
            }} />
          ) : (
            p
          ),
        )}
      </div>
    )
  }

  return (
    <>
      {/* Floating Chat Trigger Button - Fixed at bottom left */}
      <div className="fixed bottom-20 left-4 z-40 sm:bottom-6 sm:left-6">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Open FoodAI Chatbot"
          className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black text-xs shadow-xl shadow-emerald-700/30 hover:scale-105 active:scale-95 transition-all border border-emerald-400/40"
        >
          <span className="text-base animate-pulse">🥗</span>
          <span className="tracking-wide">Food AI</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
          </span>
        </button>
      </div>

      {/* Chat Window Dialog - Floating Bottom Left */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[400px] h-[520px] max-h-[80vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="p-3.5 px-4 bg-gradient-to-r from-emerald-700 via-teal-800 to-gray-900 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg shrink-0">
                🥗
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>FoodAI Assistant</span>
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-200 font-bold px-1.5 py-0.5 rounded-full">
                    AI
                  </span>
                </h3>
                <p className="text-[10px] text-emerald-200/90 font-medium truncate">
                  ● Online · Food, Nutrition & App Guide
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition text-xs"
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition font-black text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-gray-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs'
                      : 'bg-white border border-gray-200/80 text-gray-800 rounded-bl-xs'
                  }`}
                >
                  {renderFormattedText(msg.text)}
                  <div
                    className={`text-[9px] mt-1 text-right font-medium ${
                      msg.sender === 'user' ? 'text-emerald-100/70' : 'text-gray-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Follow-up suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSend(sug)}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-2xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white border border-gray-200/80 rounded-2xl w-24 rounded-bl-xs shadow-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompt suggestions carousel (if no input yet) */}
          {messages.length === 1 && !loading && (
            <div className="px-3 py-1.5 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar">
              {DEFAULT_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(sug)}
                  className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-2.5 px-3 bg-white border-t border-gray-200/80 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about foods, calories, diet..."
              className="flex-1 px-3 py-2 rounded-xl bg-gray-100 border border-transparent focus:border-emerald-500 focus:bg-white text-xs font-medium text-gray-900 focus:outline-none transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
