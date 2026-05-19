import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Download, ExternalLink, AlertTriangle, BookOpen } from 'lucide-react'
import { exportMarkdown, exportPDF } from '../utils/api'

function ConfidenceBadge({ score }) {
  const pct  = Math.round(score * 100)
  const color = score >= 0.7 ? '#10b981' : score >= 0.5 ? '#f59e0b' : '#f43f5e'
  const label = score >= 0.7 ? 'HIGH'    : score >= 0.5 ? 'MEDIUM'  : 'LOW'
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label} CONFIDENCE · {pct}%
    </div>
  )
}

function CitationCard({ citation, index }) {
  return (
    <a
      href={citation.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg border border-white/[0.06] bg-[#151922] hover:border-indigo-500/30 transition-colors group"
    >
      <div
        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5"
        style={{
          background: citation.source_type === 'web' ? 'rgba(56,189,248,0.12)' : 'rgba(16,185,129,0.12)',
          color:      citation.source_type === 'web' ? '#38bdf8' : '#10b981',
        }}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-300 group-hover:text-indigo-300 transition-colors truncate">
            {citation.title || 'Untitled source'}
          </p>
          <ExternalLink size={10} className="text-slate-600 flex-shrink-0 mt-0.5" />
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
          {citation.snippet}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: citation.source_type === 'web' ? 'rgba(56,189,248,0.1)' : 'rgba(16,185,129,0.1)',
              color:      citation.source_type === 'web' ? '#38bdf8' : '#10b981',
            }}
          >
            {citation.source_type?.toUpperCase()}
          </span>
          <span className="text-[9px] font-mono text-slate-600">
            conf: {Math.round(citation.confidence * 100)}%
          </span>
        </div>
      </div>
    </a>
  )
}

export default function ReportPanel({ result, isLoading }) {
  const [activeTab, setActiveTab] = useState('report')

  const tabs = [
    { id: 'report',   label: 'REPORT' },
    { id: 'citations',label: `CITATIONS${result ? ` (${result.citations?.length || 0})` : ''}` },
  ]

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-0 border-b border-white/[0.06] flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-mono text-[10px] tracking-widest transition-all ${
              activeTab === tab.id
                ? 'text-indigo-400 border-b border-indigo-500 bg-indigo-500/5'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Actions */}
        {result && (
          <div className="ml-auto flex items-center gap-1 pr-3">
            <ConfidenceBadge score={result.confidence_score} />
            <a
              href={exportMarkdown(result.session_id)}
              download
              className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
              title="Export Markdown"
            >
              <Download size={13} />
            </a>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'report' && (
          <>
            {isLoading && !result && (
              <div className="space-y-3">
                {[120, 80, 140, 60, 100].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 rounded"
                    style={{
                      width: `${w}%`.replace('160', '100'),
                      maxWidth: `${Math.min(w, 100)}%`,
                      background: 'linear-gradient(90deg, #151922 25%, #1c2130 50%, #151922 75%)',
                      backgroundSize: '800px 100%',
                      animation: 'shimmer 1.5s infinite',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {!result && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <BookOpen size={28} className="text-slate-700 mb-3" />
                <p className="text-xs text-slate-600 font-mono">// research report will appear here</p>
              </div>
            )}

            {result && (
              <div>
                {/* Contradictions warning */}
                {result.contradictions && result.contradictions.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-400 mb-1">
                        {result.contradictions.length} contradiction(s) detected
                      </p>
                      {result.contradictions.map((c, i) => (
                        <p key={i} className="text-xs text-amber-200/60">{c}</p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="markdown-report">
                  <ReactMarkdown>{result.report}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'citations' && (
          <div className="space-y-2">
            {!result || result.citations?.length === 0 ? (
              <p className="text-xs text-slate-600 font-mono text-center py-8">
                // citations will appear after research
              </p>
            ) : (
              result.citations.map((c, i) => (
                <CitationCard key={i} citation={c} index={i} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
