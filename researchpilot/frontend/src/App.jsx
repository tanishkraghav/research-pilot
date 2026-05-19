import React, { useState, useEffect, useCallback } from 'react'
import QueryInput      from './components/QueryInput'
import AgentGraph      from './components/AgentGraph'
import TracePanel      from './components/TracePanel'
import ReportPanel     from './components/ReportPanel'
import EvalDashboard   from './components/EvalDashboard'
import ABComparison    from './components/ABComparison'
import PromptRegistry  from './components/PromptRegistry'
import BatchEval       from './components/BatchEval'
import DocumentUploader from './components/DocumentUploader'
import SessionHistory  from './components/SessionHistory'
import { streamResearch, getSession, getHealth } from './utils/api'

// ── Nav tabs ──────────────────────────────────────────────────────────────────
const LEFT_TABS  = ['DOCS', 'HISTORY']
const RIGHT_TABS = ['GRAPH', 'TRACE']
const BOTTOM_TABS = [
  { id: 'eval',    label: 'EVAL DASHBOARD' },
  { id: 'ab',      label: 'A/B COMPARE'    },
  { id: 'prompts', label: 'PROMPT REGISTRY' },
  { id: 'batch',   label: 'BATCH EVAL'     },
]

function TabBar({ tabs, active, onSelect, className = '' }) {
  return (
    <div className={`flex border-b border-white/[0.06] ${className}`}>
      {tabs.map(tab => {
        const id    = typeof tab === 'string' ? tab : tab.id
        const label = typeof tab === 'string' ? tab : tab.label
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`px-4 py-2.5 font-mono text-[10px] tracking-widest transition-all whitespace-nowrap ${
              active === id
                ? 'text-indigo-400 border-b border-indigo-500 bg-indigo-500/5 -mb-px'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden flex flex-col ${className}`}>
      {children}
    </div>
  )
}

export default function App() {
  const [isLoading,    setIsLoading]    = useState(false)
  const [trace,        setTrace]        = useState([])
  const [result,       setResult]       = useState(null)
  const [health,       setHealth]       = useState(null)
  const [leftTab,      setLeftTab]      = useState('DOCS')
  const [rightTab,     setRightTab]     = useState('GRAPH')
  const [bottomTab,    setBottomTab]    = useState('eval')
  const [activeSession,setActiveSession]= useState(null)
  const [showBottom,   setShowBottom]   = useState(false)

  // Health check
  useEffect(() => {
    getHealth().then(setHealth).catch(() => {})
    const id = setInterval(() => getHealth().then(setHealth).catch(() => {}), 30000)
    return () => clearInterval(id)
  }, [])

  const handleResearch = useCallback((request) => {
    setIsLoading(true)
    setTrace([])
    setResult(null)
    setActiveSession(null)
    setRightTab('GRAPH')

    streamResearch(
      request,
      (traceEvent) => {
        setTrace(prev => [...prev, traceEvent])
      },
      (finalResult) => {
        setResult(finalResult)
        setActiveSession(finalResult.session_id)
        setIsLoading(false)
        setShowBottom(false)
      },
      (errorMsg) => {
        setTrace(prev => [...prev, {
          node: 'pipeline', status: 'error',
          detail: `Error: ${errorMsg}`,
          timestamp: new Date().toISOString(),
          confidence: null,
        }])
        setIsLoading(false)
      }
    )
  }, [])

  const handleSessionSelect = useCallback(async (id) => {
    setActiveSession(id)
    const s = await getSession(id).catch(() => null)
    if (!s) return
    setResult({
      session_id:       s.id,
      query:            s.query,
      report:           s.report,
      citations:        s.citations,
      confidence_score: s.confidence_score,
      model_used:       s.model_used,
      contradictions:   [],
    })
    setTrace(s.trace || [])
    setRightTab('TRACE')
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#05050a' }}>

      {/* ── Top bar ── */}
      <header className="flex-shrink-0 h-12 border-b border-white/[0.06] bg-[#0a0d14] flex items-center px-5 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9"   stroke="#6366f1" strokeWidth="1" opacity="0.4"/>
            <circle cx="10" cy="10" r="4.5" stroke="#6366f1" strokeWidth="1"/>
            <circle cx="10" cy="10" r="1.5" fill="#6366f1"/>
            <line x1="1" y1="10" x2="5.5" y2="10" stroke="#6366f1" strokeWidth="1" opacity="0.6"/>
            <line x1="14.5" y1="10" x2="19" y2="10" stroke="#6366f1" strokeWidth="1" opacity="0.6"/>
            <line x1="10" y1="1"  x2="10" y2="5.5" stroke="#6366f1" strokeWidth="1" opacity="0.6"/>
            <line x1="10" y1="14.5" x2="10" y2="19" stroke="#6366f1" strokeWidth="1" opacity="0.6"/>
          </svg>
          <span className="font-mono text-sm font-bold text-slate-200 tracking-tight">
            Research<span className="text-indigo-400">Pilot</span>
          </span>
        </div>

        <span className="text-[10px] font-mono text-slate-600">
          Multi-agent AI · LangGraph + Groq · PromptOps eval
        </span>

        <div className="ml-auto flex items-center gap-4">
          {health && (
            <span className="text-[10px] font-mono text-slate-600">
              {health.indexed_docs} docs · {health.total_sessions} sessions · {health.total_evals} evals
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${health ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-mono text-slate-600">
              {health ? 'online' : 'offline'}
            </span>
          </div>

          {/* Toggle PromptOps panel */}
          <button
            onClick={() => setShowBottom(s => !s)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all border ${
              showBottom
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300'
            }`}
          >
            PromptOps {showBottom ? '▲' : '▼'}
          </button>
        </div>
      </header>

      {/* ── Main 3-column layout ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '220px 1fr 280px',
        gridTemplateRows: showBottom ? '1fr 320px' : '1fr',
        gap: 10,
        padding: 10,
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* ── LEFT column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gridRow: '1 / 2' }}>
          <Panel className="flex-1">
            <TabBar tabs={LEFT_TABS} active={leftTab} onSelect={setLeftTab} />
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {leftTab === 'DOCS'    && <DocumentUploader />}
              {leftTab === 'HISTORY' && <SessionHistory onSelect={handleSessionSelect} activeId={activeSession} />}
            </div>
          </Panel>
        </div>

        {/* ── CENTER column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, gridRow: '1 / 2' }}>
          {/* Query input */}
          <div style={{ flexShrink: 0 }}>
            <QueryInput onSubmit={handleResearch} isLoading={isLoading} />
          </div>

          {/* Report */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ReportPanel result={result} isLoading={isLoading} />
          </div>
        </div>

        {/* ── RIGHT column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gridRow: '1 / 2' }}>
          <Panel className="flex-1">
            <TabBar tabs={RIGHT_TABS} active={rightTab} onSelect={setRightTab} />
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {rightTab === 'GRAPH' && (
                <div style={{ flex: 1, padding: 4 }}>
                  <AgentGraph trace={trace} isLoading={isLoading} />
                </div>
              )}
              {rightTab === 'TRACE' && (
                <TracePanel trace={trace} isLoading={isLoading} />
              )}
            </div>
          </Panel>
        </div>

        {/* ── BOTTOM row — PromptOps ── */}
        {showBottom && (
          <div style={{ gridColumn: '1 / 4', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Panel className="flex-1">
              <TabBar tabs={BOTTOM_TABS} active={bottomTab} onSelect={setBottomTab} />
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {bottomTab === 'eval'    && <EvalDashboard />}
                {bottomTab === 'ab'      && <ABComparison />}
                {bottomTab === 'prompts' && <PromptRegistry />}
                {bottomTab === 'batch'   && <BatchEval />}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
