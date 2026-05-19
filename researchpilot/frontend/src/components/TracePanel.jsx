import React, { useEffect, useRef } from 'react'

const NODE_COLORS = {
  pipeline:    '#6366f1',
  supervisor:  '#8b5cf6',
  web_search:  '#38bdf8',
  academic:    '#10b981',
  fact_check:  '#f59e0b',
  synthesiser: '#f43f5e',
}

const NODE_ICONS = {
  pipeline:    '◉',
  supervisor:  '⬡',
  web_search:  '⊕',
  academic:    '◧',
  fact_check:  '⊛',
  synthesiser: '◈',
}

export default function TracePanel({ trace, isLoading }) {
  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [trace?.length])

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
        <span className="text-indigo-400 text-[8px]">▶</span>
        <span className="font-mono text-[10px] tracking-widest text-slate-500">EXECUTION_TRACE</span>
        {trace && (
          <span className="ml-auto font-mono text-[10px] text-slate-600">
            {trace.length} events
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (!trace || trace.length === 0) && (
          <div className="flex items-center gap-3 p-3">
            <div className="w-4 h-4 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-mono">Initialising pipeline...</span>
          </div>
        )}

        {!trace || trace.length === 0 && !isLoading ? (
          <p className="text-xs text-slate-600 font-mono text-center py-8">
            // pipeline trace appears here
          </p>
        ) : null}

        {(trace || []).map((event, i) => {
          const color = NODE_COLORS[event.node] || '#64748b'
          const icon  = NODE_ICONS[event.node]  || '◦'
          return (
            <div
              key={i}
              className="flex gap-3 animate-slide-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {/* Icon + line */}
              <div className="flex flex-col items-center gap-0 flex-shrink-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                    color,
                  }}
                >
                  {icon}
                </div>
                {i < (trace.length - 1) && (
                  <div className="w-px flex-1 min-h-2" style={{ background: `${color}20` }} />
                )}
              </div>

              {/* Content */}
              <div className="pb-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="font-mono text-[10px] font-bold tracking-wide uppercase"
                    style={{ color }}
                  >
                    {event.node}
                  </span>
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      background: `${color}15`,
                      color: `${color}cc`,
                    }}
                  >
                    {event.status}
                  </span>
                  {event.confidence !== null && event.confidence !== undefined && (
                    <span className="font-mono text-[9px] text-slate-500 ml-auto">
                      {Math.round(event.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed break-words">
                  {event.detail}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {trace && trace.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-[10px] text-emerald-400">PIPELINE COMPLETE</span>
        </div>
      )}
    </div>
  )
}
