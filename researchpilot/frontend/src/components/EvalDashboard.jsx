import React, { useState, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { getEvalStats, getEvalHistory } from '../utils/api'

const DIM_COLORS = {
  relevance:    '#6366f1',
  faithfulness: '#10b981',
  conciseness:  '#f59e0b',
  safety:       '#38bdf8',
}

function ScoreBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono mb-1">
        <span className="text-slate-500 capitalize">{label}</span>
        <span style={{ color }}>{Math.round(value * 100)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function EvalDashboard() {
  const [stats,   setStats]   = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getEvalStats(), getEvalHistory(20)])
      .then(([s, h]) => { setStats(s); setHistory(h) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] p-6 flex items-center gap-3">
        <div className="w-4 h-4 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-mono">Loading eval data...</span>
      </div>
    )
  }

  const models = stats?.models || []

  return (
    <div className="space-y-4">
      {/* Model comparison */}
      {models.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-widest text-slate-500">MODEL_PERFORMANCE</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={models} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="model" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{ background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                  formatter={v => [Math.round(v * 100) + '/100']}
                />
                <Bar dataKey="avg_overall" radius={4}>
                  {models.map((m, i) => (
                    <Cell key={i} fill={['#6366f1','#10b981','#f59e0b','#38bdf8'][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-model radar (first model) */}
      {models.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-widest text-slate-500">QUALITY_DIMENSIONS · {models[0]?.model}</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <RadarChart data={[
                    { dim: 'Relevance',    value: models[0]?.avg_relevance    || 0 },
                    { dim: 'Faithfulness', value: models[0]?.avg_faithfulness || 0 },
                    { dim: 'Conciseness',  value: models[0]?.avg_conciseness  || 0 },
                    { dim: 'Safety',       value: 1 },
                  ]}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }} />
                    <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex flex-col justify-center">
                {Object.entries(DIM_COLORS).map(([dim, color]) => (
                  <ScoreBar
                    key={dim}
                    label={dim}
                    value={models[0]?.[`avg_${dim}`] || 0}
                    color={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Eval history table */}
      {history.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-widest text-slate-500">EVAL_HISTORY · last {history.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Query', 'Model', 'Overall', 'Relevance', 'Faith.', 'Latency'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] text-slate-600 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-slate-400 max-w-[180px] truncate">{row.query}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-indigo-400">{row.model_name.split('/').pop()}</td>
                    <td className="px-3 py-2 font-mono">
                      <span style={{ color: row.overall_score >= 0.7 ? '#10b981' : row.overall_score >= 0.5 ? '#f59e0b' : '#f43f5e' }}>
                        {Math.round(row.overall_score * 100)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-500">{Math.round(row.relevance_score * 100)}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{Math.round(row.faithfulness_score * 100)}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{row.latency_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {models.length === 0 && history.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] p-8 text-center">
          <p className="text-xs text-slate-600 font-mono">// Run an A/B comparison to see eval data</p>
        </div>
      )}
    </div>
  )
}
