import React, { useState } from 'react'
import { compareModels } from '../utils/api'
import { Trophy, Zap, Clock } from 'lucide-react'

const AVAILABLE_MODELS = [
  // Groq models (free)
  { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B', provider: 'Groq',       free: true },
  { id: 'llama-3.1-70b-versatile', label: 'LLaMA 3.1 70B', provider: 'Groq',       free: true },
  { id: 'llama-3.1-8b-instant',    label: 'LLaMA 3.1 8B',  provider: 'Groq',       free: true },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',  provider: 'Groq',       free: true },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',    provider: 'Groq',       free: true },
  // OpenRouter free tier
  { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'LLaMA 3.1 8B', provider: 'OpenRouter', free: true },
  { id: 'google/gemma-2-9b-it:free',             label: 'Gemma 2 9B',   provider: 'OpenRouter', free: true },
  { id: 'mistralai/mistral-7b-instruct:free',    label: 'Mistral 7B',   provider: 'OpenRouter', free: true },
]

function ScorePill({ label, value }) {
  const color = value >= 0.7 ? '#10b981' : value >= 0.5 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-base font-bold" style={{ color }}>{Math.round(value * 100)}</span>
      <span className="font-mono text-[9px] text-slate-600 capitalize">{label}</span>
    </div>
  )
}

function ModelResult({ result, isWinner }) {
  return (
    <div
      className={`flex-1 rounded-xl border p-4 transition-all ${
        isWinner
          ? 'border-indigo-500/40 bg-indigo-500/5'
          : 'border-white/[0.06] bg-[#0f1219]'
      }`}
    >
      {/* Model header */}
      <div className="flex items-center gap-2 mb-3">
        {isWinner && <Trophy size={13} className="text-amber-400" />}
        <div>
          <p className="text-xs font-semibold text-slate-200">{result.model_name.split('/').pop()}</p>
          <p className="text-[10px] font-mono text-slate-600">{result.model_name.includes('/') ? 'OpenRouter' : 'Groq'}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-slate-600">
          <Clock size={10} />
          {result.latency_ms}ms
        </div>
      </div>

      {/* Scores row */}
      <div className="flex justify-between mb-3 px-1">
        <ScorePill label="overall"     value={result.scores.overall} />
        <ScorePill label="relevance"   value={result.scores.relevance} />
        <ScorePill label="faithful."   value={result.scores.faithfulness} />
        <ScorePill label="concise"     value={result.scores.conciseness} />
      </div>

      {/* Response preview */}
      <div className="bg-[#151922] rounded-lg p-3 max-h-40 overflow-y-auto">
        <p className="text-xs text-slate-400 leading-relaxed">{result.response}</p>
      </div>

      {/* Critic reasoning */}
      {result.scores.reasoning && (
        <p className="mt-2 text-[10px] text-slate-600 leading-relaxed italic">
          "{result.scores.reasoning.slice(0, 160)}..."
        </p>
      )}
    </div>
  )
}

export default function ABComparison() {
  const [query,          setQuery]          = useState('')
  const [selectedModels, setSelectedModels] = useState(['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'])
  const [result,         setResult]         = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)

  const toggleModel = id => {
    setSelectedModels(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev
        : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const handleRun = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await compareModels({ query: query.trim(), models: selectedModels })
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Config panel */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] p-4 space-y-3">
        <div className="font-mono text-[10px] tracking-widest text-slate-500">A/B MODEL COMPARISON</div>

        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter a query to compare models..."
          rows={2}
          className="w-full bg-[#151922] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 resize-none focus:border-indigo-500/40 transition-colors"
        />

        {/* Model selector */}
        <div>
          <p className="text-[10px] font-mono text-slate-600 mb-2">Select 2-3 models (select up to 3):</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_MODELS.map(m => {
              const active = selectedModels.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all border ${
                    active
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                      : 'border-white/[0.06] text-slate-500 hover:border-white/[0.12] hover:text-slate-300'
                  }`}
                >
                  {m.label}
                  <span className="ml-1 opacity-50">{m.provider}</span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={loading || !query.trim() || selectedModels.length < 2}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all ${
            loading || !query.trim() || selectedModels.length < 2
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <Zap size={12} />
          {loading ? 'COMPARING...' : 'RUN COMPARISON'}
        </button>

        {error && (
          <p className="text-xs text-rose-400 font-mono">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3 animate-fade-in">
          {/* Winner banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-3">
            <Trophy size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">
                Winner: {result.winner}
              </p>
              <p className="text-xs text-amber-200/60 mt-0.5">{result.winner_reasoning}</p>
            </div>
          </div>

          {/* Side-by-side results */}
          <div className="flex gap-3 flex-wrap lg:flex-nowrap">
            {result.results.map(r => (
              <ModelResult
                key={r.model_name}
                result={r}
                isWinner={r.model_name === result.winner || result.winner.includes(r.model_name.split('/').pop())}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
