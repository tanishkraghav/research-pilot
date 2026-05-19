import React, { useEffect, useState } from 'react'
import { getSessions } from '../utils/api'
import { History, ChevronRight } from 'lucide-react'

export default function SessionHistory({ onSelect, activeId }) {
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    getSessions().then(setSessions).catch(() => {})
  }, [activeId])

  if (sessions.length === 0) return (
    <div className="p-4 text-center">
      <p className="text-[10px] font-mono text-slate-700">// no sessions yet</p>
    </div>
  )

  return (
    <div className="space-y-1 p-2">
      {sessions.map(s => {
        const score = s.confidence_score
        const color = score >= 0.7 ? '#10b981' : score >= 0.5 ? '#f59e0b' : '#f43f5e'
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all ${
              activeId === s.id ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 truncate leading-snug">{s.query}</p>
              <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                {Math.round(score * 100)}% · {s.model_used?.split('-').slice(0,3).join('-')}
              </p>
            </div>
            <ChevronRight size={10} className="text-slate-700 flex-shrink-0" />
          </button>
        )
      })}
    </div>
  )
}
