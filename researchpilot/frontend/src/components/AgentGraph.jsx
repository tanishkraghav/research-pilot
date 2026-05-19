import React, { useEffect, useState } from 'react'

const NODE_DEFS = {
  pipeline:    { label: 'START',       color: '#6366f1', icon: '◉', x: 160, y: 30  },
  supervisor:  { label: 'SUPERVISOR',  color: '#8b5cf6', icon: '⬡', x: 160, y: 110 },
  web_search:  { label: 'WEB SEARCH',  color: '#38bdf8', icon: '🌐', x: 60,  y: 210 },
  academic:    { label: 'ACADEMIC',    color: '#10b981', icon: '📄', x: 160, y: 210 },
  fact_check:  { label: 'FACT CHECK',  color: '#f59e0b', icon: '✓',  x: 260, y: 210 },
  synthesiser: { label: 'SYNTHESISER', color: '#f43f5e', icon: '◈',  x: 160, y: 310 },
}

const EDGES = [
  ['pipeline', 'supervisor'],
  ['supervisor', 'web_search'],
  ['supervisor', 'academic'],
  ['supervisor', 'fact_check'],
  ['web_search', 'synthesiser'],
  ['academic', 'synthesiser'],
  ['fact_check', 'synthesiser'],
]

function NodeBox({ id, def, status }) {
  const isActive   = status === 'running'
  const isComplete = status === 'complete'
  const isSkipped  = status === 'skipped'
  const isError    = status === 'error'
  const isIdle     = !status

  const border = isActive   ? def.color
               : isComplete ? def.color
               : isError    ? '#f43f5e'
               : 'rgba(255,255,255,0.08)'

  const bg = isComplete ? `${def.color}18`
           : isActive   ? `${def.color}22`
           : 'rgba(255,255,255,0.02)'

  const textColor = isIdle ? '#475569' : isSkipped ? '#475569' : def.color

  return (
    <g className={isComplete || isActive ? 'animate-node' : ''}>
      <rect
        x={def.x - 44} y={def.y - 18}
        width={88} height={36}
        rx={8}
        fill={bg}
        stroke={border}
        strokeWidth={isActive ? 1.5 : 0.7}
        style={{
          filter: isActive ? `drop-shadow(0 0 8px ${def.color}60)` : 'none',
          transition: 'all 0.4s ease',
        }}
      />
      {/* Pulse ring when active */}
      {isActive && (
        <rect
          x={def.x - 48} y={def.y - 22}
          width={96} height={44}
          rx={11} fill="none"
          stroke={def.color}
          strokeWidth={0.8}
          opacity={0.4}
          style={{ animation: 'glow-pulse 1.2s ease infinite' }}
        />
      )}
      <text
        x={def.x} y={def.y - 4}
        textAnchor="middle"
        fontSize={9}
        fontFamily="JetBrains Mono, monospace"
        fontWeight={600}
        fill={textColor}
        style={{ transition: 'fill 0.3s ease' }}
      >
        {def.label}
      </text>
      <text
        x={def.x} y={def.y + 9}
        textAnchor="middle"
        fontSize={8}
        fontFamily="JetBrains Mono, monospace"
        fill={isIdle || isSkipped ? '#334155' : `${def.color}99`}
      >
        {isActive ? '● running' : isComplete ? '✓ done' : isSkipped ? '— skipped' : isError ? '✗ error' : '○ idle'}
      </text>
    </g>
  )
}

export default function AgentGraph({ trace, isLoading }) {
  const [nodeStatus, setNodeStatus] = useState({})

  useEffect(() => {
    if (!trace) return
    const status = {}
    for (const event of trace) {
      if (NODE_DEFS[event.node]) {
        status[event.node] = event.status
      }
    }
    setNodeStatus(status)
  }, [trace])

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
        <span className="text-indigo-400 text-[8px]">◈</span>
        <span className="font-mono text-[10px] tracking-widest text-slate-500">AGENT_GRAPH</span>
        {isLoading && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-[10px] text-indigo-400">running</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-2">
        <svg viewBox="0 0 320 360" width="100%" style={{ maxHeight: 340 }}>
          {/* Edges */}
          {EDGES.map(([from, to]) => {
            const f = NODE_DEFS[from], t = NODE_DEFS[to]
            if (!f || !t) return null
            const fromDone = nodeStatus[from] === 'complete'
            return (
              <line
                key={`${from}-${to}`}
                x1={f.x} y1={f.y + 18}
                x2={t.x} y2={t.y - 18}
                stroke={fromDone ? f.color : 'rgba(255,255,255,0.06)'}
                strokeWidth={fromDone ? 1.5 : 0.8}
                strokeDasharray={fromDone ? 'none' : '3 3'}
                style={{
                  filter: fromDone ? `drop-shadow(0 0 4px ${f.color}40)` : 'none',
                  transition: 'all 0.5s ease',
                }}
              />
            )
          })}

          {/* Nodes */}
          {Object.entries(NODE_DEFS).map(([id, def]) => (
            <NodeBox key={id} id={id} def={def} status={nodeStatus[id]} />
          ))}
        </svg>
      </div>

      {/* Confidence bar at bottom */}
      {trace && trace.length > 0 && (
        <div className="px-4 pb-3 flex-shrink-0">
          {trace
            .filter(e => e.confidence !== null && e.confidence !== undefined)
            .slice(-1)
            .map((e, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>confidence</span>
                  <span className="text-indigo-400">{Math.round(e.confidence * 100)}%</span>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${e.confidence * 100}%`,
                      background: e.confidence >= 0.7 ? '#10b981' : e.confidence >= 0.5 ? '#f59e0b' : '#f43f5e',
                    }}
                  />
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
