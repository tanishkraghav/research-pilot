import React, { useState, useEffect } from 'react'
import { listPrompts, getVersions, getDiff, createPrompt } from '../utils/api'
import { GitBranch, Plus, ChevronRight } from 'lucide-react'

function DiffView({ diff }) {
  if (!diff) return null
  const aLines = diff.content_a.split('\n')
  const bLines = diff.content_b.split('\n')

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden text-xs font-mono">
      <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
        <div className="p-3">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">v{diff.version_a}</span>
            <span className="text-rose-400">{Math.round(diff.score_a * 100)}/100</span>
          </div>
          {aLines.map((line, i) => (
            <div key={i} className={`leading-relaxed ${!bLines[i] || bLines[i] !== line ? 'text-rose-300 bg-rose-500/5 px-1 rounded' : 'text-slate-500'}`}>
              {line || '\u00A0'}
            </div>
          ))}
        </div>
        <div className="p-3">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">v{diff.version_b}</span>
            <span className="text-emerald-400">{Math.round(diff.score_b * 100)}/100</span>
          </div>
          {bLines.map((line, i) => (
            <div key={i} className={`leading-relaxed ${!aLines[i] || aLines[i] !== line ? 'text-emerald-300 bg-emerald-500/5 px-1 rounded' : 'text-slate-500'}`}>
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PromptRegistry() {
  const [prompts,   setPrompts]   = useState([])
  const [selected,  setSelected]  = useState(null)
  const [versions,  setVersions]  = useState([])
  const [diff,      setDiff]      = useState(null)
  const [showCreate,setShowCreate] = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newContent,setNewContent]= useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    listPrompts().then(setPrompts).catch(() => {})
  }, [])

  const handleSelect = async name => {
    setSelected(name)
    setDiff(null)
    const v = await getVersions(name).catch(() => [])
    setVersions(v)
  }

  const handleDiff = async (name, v1, v2) => {
    const d = await getDiff(name, v1, v2).catch(() => null)
    setDiff(d)
  }

  const handleCreate = async () => {
    if (!newName || !newContent) return
    setSaving(true)
    try {
      await createPrompt({ name: newName, content: newContent, description: newDesc })
      const fresh = await listPrompts()
      setPrompts(fresh)
      setShowCreate(false)
      setNewName(''); setNewContent(''); setNewDesc('')
    } catch {}
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={13} className="text-indigo-400" />
          <span className="font-mono text-[10px] tracking-widest text-slate-500">PROMPT_REGISTRY</span>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-xs text-indigo-300 hover:bg-indigo-600/30 transition-all font-mono"
        >
          <Plus size={12} /> new prompt
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3 animate-fade-in">
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Prompt name (e.g. web_search_agent)"
            className="w-full bg-[#151922] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 font-mono focus:border-indigo-500/40"
          />
          <input
            value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-[#151922] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500/40"
          />
          <textarea
            value={newContent} onChange={e => setNewContent(e.target.value)}
            placeholder="Prompt content..."
            rows={4}
            className="w-full bg-[#151922] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 font-mono resize-none focus:border-indigo-500/40"
          />
          <button
            onClick={handleCreate} disabled={saving || !newName || !newContent}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-mono rounded-lg transition-all"
          >
            {saving ? 'Saving...' : 'Save prompt'}
          </button>
        </div>
      )}

      {/* Prompt list */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden">
        {prompts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-600 font-mono">// No prompts yet. Create your first prompt above.</p>
          </div>
        ) : (
          prompts.map(p => (
            <button
              key={p.name}
              onClick={() => handleSelect(p.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors text-left ${selected === p.name ? 'bg-indigo-500/5' : ''}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-slate-300">{p.name}</p>
                <p className="text-[10px] text-slate-600">v{p.active_version} · {p.run_count} runs · avg {Math.round(p.avg_score * 100)}/100</p>
              </div>
              <ChevronRight size={12} className="text-slate-600" />
            </button>
          ))
        )}
      </div>

      {/* Version history */}
      {selected && versions.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden animate-fade-in">
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-widest text-slate-500">
              VERSION HISTORY · {selected}
            </span>
          </div>
          <div className="p-3 space-y-2">
            {versions.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#151922] border border-white/[0.04]">
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded ${v.is_active ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.05] text-slate-500'}`}
                >
                  v{v.version}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 truncate">{v.description || '—'}</p>
                  <p className="text-[10px] font-mono text-slate-600">{v.run_count} runs · {Math.round(v.avg_score * 100)}/100</p>
                </div>
                {v.is_active && <span className="text-[9px] font-mono text-emerald-400">active</span>}
              </div>
            ))}

            {/* Diff selector */}
            {versions.length >= 2 && (
              <button
                onClick={() => handleDiff(selected, versions[versions.length - 1].version, versions[0].version)}
                className="w-full py-2 text-xs font-mono text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/5 transition-all"
              >
                Compare oldest → latest
              </button>
            )}
          </div>
        </div>
      )}

      {diff && <DiffView diff={diff} />}
    </div>
  )
}
