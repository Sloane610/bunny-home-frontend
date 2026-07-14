import { useState, useEffect, useRef } from 'react'
import { Send, Plus, Settings, Menu, X, Trash2 } from 'lucide-react'
import { fetchAPI } from './lib/api'
import type { Session, Message, Settings as SettingsType } from './lib/types'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<SettingsType>({
    system_prompt: '',
    temperature: 0.8,
    context_rounds: 20,
    compress_threshold: 4000,
    compress_keep_rounds: 6,
    max_reply_tokens: 1000,
    boyfriend_name: '他'
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    loadSessions()
    loadSettings()
  }, [])

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession)
    }
  }, [currentSession])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function loadSessions() {
    try {
      const data = await fetchAPI('/api/sessions')
      setSessions(data)
      if (data.length > 0 && !currentSession) {
        setCurrentSession(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }

  async function loadMessages(sessionId: string) {
    try {
      const data = await fetchAPI(`/api/sessions/${sessionId}/messages`)
      setMessages(data)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  async function loadSettings() {
    try {
      const data = await fetchAPI('/api/settings')
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  async function createSession() {
    try {
      const data = await fetchAPI('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ name: '新对话' })
      })
      setSessions(prev => [data, ...prev])
      setCurrentSession(data.id)
      setMessages([])
      setSidebarOpen(false)
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('确定删除这个对话吗？')) return
    try {
      await fetchAPI(`/api/sessions/${id}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== id))
      if (currentSession === id) {
        const remaining = sessions.filter(s => s.id !== id)
        setCurrentSession(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  async function sendMessage() {
    if (!input.trim() || !currentSession || loading) return

    const content = input.trim()
    setInput('')
    setLoading(true)

    // Optimistic update
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      session_id: currentSession,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      visible: true
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const data = await fetchAPI('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ session_id: currentSession, content })
      })

      const aiMsg: Message = {
        id: `temp-ai-${Date.now()}`,
        session_id: currentSession,
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
        visible: true
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      console.error('Send failed:', err)
      const errMsg: Message = {
        id: `temp-err-${Date.now()}`,
        session_id: currentSession,
        role: 'assistant',
        content: '抱歉，消息发送失败了，请稍后重试...',
        created_at: new Date().toISOString(),
        visible: true
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    try {
      await fetchAPI('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })
      setShowSettings(false)
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const currentSessionName = sessions.find(s => s.id === currentSession)?.name || ''

  return (
    <>
      {showSplash && (
        <div className="splash">
          <h1>{settings.boyfriend_name || '他'} & 你</h1>
          <p>欢迎回家</p>
        </div>
      )}

      <div className="app">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>对话</h2>
            <button className="icon-btn" onClick={createSession} aria-label="新建对话">
              <Plus size={18} />
            </button>
          </div>
          <div className="sidebar-sessions">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`session-item ${session.id === currentSession ? 'active' : ''}`}
                onClick={() => { setCurrentSession(session.id); setSidebarOpen(false) }}
              >
                <span>{session.name}</span>
                <button
                  className="icon-btn"
                  onClick={(e) => deleteSession(session.id, e)}
                  aria-label="删除对话"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                还没有对话，点击 + 开始吧
              </p>
            )}
          </div>
          <div className="sidebar-footer">
            <button className="btn btn-ghost" onClick={() => setShowSettings(true)} style={{ width: '100%' }}>
              <Settings size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              设置
            </button>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="chat-area">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="icon-btn" onClick={() => setSidebarOpen(true)} style={{ display: 'none' }} id="menu-btn">
                <Menu size={20} />
              </button>
              <h3>{currentSessionName || settings.boyfriend_name || '他'}</h3>
            </div>
            <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="设置">
              <Settings size={18} />
            </button>
          </div>

          <div className="messages-container">
            {!currentSession ? (
              <div className="empty-state">
                <p>选择一个对话或创建新对话</p>
                <button className="btn btn-primary" onClick={createSession}>开始新对话</button>
              </div>
            ) : messages.length === 0 && !loading ? (
              <div className="empty-state">
                <p>说点什么吧，{settings.boyfriend_name || '他'}在等你~</p>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.role}`}>
                    <div className="message-bubble">{msg.content}</div>
                    <span className="message-time">{formatTime(msg.created_at)}</span>
                  </div>
                ))}
                {loading && (
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {currentSession && (
            <div className="input-area">
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`跟${settings.boyfriend_name || '他'}说点什么...`}
                  rows={1}
                  disabled={loading}
                />
                <button
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  aria-label="发送"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>设置</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label>他的名字</label>
              <input
                value={settings.boyfriend_name}
                onChange={e => setSettings(s => ({ ...s, boyfriend_name: e.target.value }))}
                placeholder="给他取个名字"
              />
            </div>

            <div className="form-group">
              <label>人设提示词（系统提示词）</label>
              <textarea
                value={settings.system_prompt}
                onChange={e => setSettings(s => ({ ...s, system_prompt: e.target.value }))}
                placeholder="定义他的性格和说话方式..."
                rows={5}
              />
            </div>

            <div className="form-group">
              <label>温度 (0-1，越高越随机): {settings.temperature}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={e => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="form-group">
              <label>上下文保留轮数</label>
              <input
                type="number"
                value={settings.context_rounds}
                onChange={e => setSettings(s => ({ ...s, context_rounds: parseInt(e.target.value) || 20 }))}
              />
            </div>

            <div className="form-group">
              <label>最大回复长度 (tokens)</label>
              <input
                type="number"
                value={settings.max_reply_tokens}
                onChange={e => setSettings(s => ({ ...s, max_reply_tokens: parseInt(e.target.value) || 1000 }))}
              />
            </div>

            <div className="settings-actions">
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveSettings}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
