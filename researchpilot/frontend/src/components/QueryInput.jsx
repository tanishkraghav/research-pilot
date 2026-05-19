import React, { useState } from 'react'
import { Search, Zap, Settings, ChevronDown } from 'lucide-react'

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B', badge: 'Groq', quality: 'Latest' },
  { id: 'llama-3.1-70b-versatile', label: 'LLaMA 3.1 70B', badge: 'Groq', quality: 'Best' },
  { id: 'llama-3.1-8b-instant',    label: 'LLaMA 3.1 8B',  badge: 'Groq', quality: 'Fast' },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',  badge: 'Groq', quality: 'MoE' },
]

export default function QueryInput({ onSubmit, isLoading }) {
  const [query, setQuery] = useState('')
  const [model, setModel] = useState(GROQ_MODELS[0].id)
  const [maxSources, setMaxSources] = useState(5)
  const [enableAcademic, setEnableAcademic] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  const handleSubmit = () => {
    if (!query.trim() || isLoading) return
    onSubmit({ query: query.trim(), model, max_sources: maxSources, enable_academic: enableAcademic })
  }

  const handleKey = e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const selected = GROQ_MODELS.find(m => m.id === model)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
        <Search size={12} className="text-indigo-400" />
        <span className="font-mono text-[10px] tracking-widest text-slate-500">RESEARCH_QUERY</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] text-slate-500">online</span>
        </div>
      </div>

      {/* Textarea */}
      <div className="p-4">
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="What do you want to research? e.g. 'Latest advances in multimodal LLMs and their real-world applications'"
          rows={3}
          className="w-full bg-[#151922] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none leading-relaxed focus:border-indigo-500/40 transition-colors"
        />

        {/* Controls row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {/* Model picker */}
          <div className="relative">
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="appearance-none bg-[#151922] border border-white/[0.08] rounded-lg pl-3 pr-8 py-2 text-xs text-slate-300 font-mono cursor-pointer focus:border-indigo-500/40"
            >
              {GROQ_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label} · {m.quality}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#151922] border border-white/[0.08] text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Settings size={12} />
            <span className="font-mono">options</span>
          </button>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
            className={`ml-auto flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all ${
              isLoading || !query.trim()
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            <Zap size={12} />
            {isLoading ? 'RESEARCHING...' : 'RUN RESEARCH'}
          </button>
        </div>

        {/* Expandable settings */}
        {showSettings && (
          <div className="mt-3 p-3 bg-[#151922] rounded-lg border border-white/[0.06] flex flex-wrap gap-6 animate-fade-in">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={enableAcademic}
                onChange={e => setEnableAcademic(e.target.checked)}
                className="accent-indigo-500"
              />
              Enable academic RAG (uploaded docs)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Max sources:
              <input
                type="range" min={3} max={10} value={maxSources}
                onChange={e => setMaxSources(Number(e.target.value))}
                className="w-20 accent-indigo-500"
              />
              <span className="font-mono text-indigo-400">{maxSources}</span>
            </label>
          </div>
        )}

        <div className="mt-2 text-[10px] text-slate-600 font-mono">
          ⌘+Enter to run · Powered by Groq (free tier)
        </div>
      </div>
    </div>
  )
}
