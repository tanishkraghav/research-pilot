import React, { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { startBatchEval, getBatchJobs, getBatchJob } from '../utils/api'
import { Upload, Play, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B · Groq' },
  { id: 'llama-3.1-70b-versatile', label: 'LLaMA 3.1 70B · Groq' },
  { id: 'llama-3.1-8b-instant',    label: 'LLaMA 3.1 8B · Groq'  },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B · Groq'  },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'LLaMA 3.1 8B · OpenRouter' },
]

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const inputIdx    = header.indexOf('input')
  const expectedIdx = header.indexOf('expected_output')
  if (inputIdx === -1) return []
  return lines.slice(1).map(line => {
    const cols = line.split(',')
    return {
      input:           (cols[inputIdx]    || '').trim(),
      expected_output: expectedIdx !== -1 ? (cols[expectedIdx] || '').trim() : null,
    }
  }).filter(tc => tc.input)
}

function StatusIcon({ status }) {
  if (status === 'complete') return <CheckCircle size={13} className="text-emerald-400" />
  if (status === 'running')  return <RefreshCw   size={13} className="text-indigo-400 animate-spin" />
  if (status === 'pending')  return <Clock       size={13} className="text-amber-400" />
  return                            <AlertCircle size={13} className="text-rose-400" />
}

function ScoreCell({ value }) {
  const color = value >= 0.7 ? '#10b981' : value >= 0.5 ? '#f59e0b' : '#f43f5e'
  return (
    <span className="font-mono text-xs" style={{ color }}>
      {Math.round(value * 100)}
    </span>
  )
}

export default function BatchEval() {
  const [testCases,   setTestCases]   = useState([])
  const [jobName,     setJobName]     = useState('')
  const [model,       setModel]       = useState(MODELS[0].id)
  const [jobs,        setJobs]        = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDetail,   setJobDetail]   = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [parseError,  setParseError]  = useState(null)
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    getBatchJobs().then(setJobs).catch(() => {})
  }, [])

  const onDrop = useCallback(files => {
    const file = files[0]
    if (!file) return
    setParseError(null)
    const reader = new FileReader()
    reader.onload = e => {
      const cases = parseCSV(e.target.result)
      if (cases.length === 0) {
        setParseError('CSV must have an "input" column. Optional: "expected_output".')
      } else {
        setTestCases(cases)
      }
    }
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1,
  })

  const addManual = () => {
    const lines = manualInput.split('\n').map(l => l.trim()).filter(Boolean)
    const cases = lines.map(l => ({ input: l, expected_output: null }))
    setTestCases(prev => [...prev, ...cases])
    setManualInput('')
  }

  const handleRun = async () => {
    if (!jobName || testCases.length === 0 || loading) return
    setLoading(true)
    try {
      await startBatchEval({ name: jobName, model_name: model, test_cases: testCases })
      const fresh = await getBatchJobs()
      setJobs(fresh)
      setJobName('')
      setTestCases([])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleViewJob = async id => {
    setSelectedJob(id)
    const detail = await getBatchJob(id).catch(() => null)
    setJobDetail(detail)
  }

  const refreshJobs = async () => {
    const fresh = await getBatchJobs().catch(() => [])
    setJobs(fresh)
    if (selectedJob) {
      const detail = await getBatchJob(selectedJob).catch(() => null)
      setJobDetail(detail)
    }
  }

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] p-4 space-y-3">
        <div className="font-mono text-[10px] tracking-widest text-slate-500">BATCH EVALUATION</div>

        <div className="flex gap-3">
          <input
            value={jobName}
            onChange={e => setJobName(e.target.value)}
            placeholder="Job name (e.g. v2-prompt-test)"
            className="flex-1 bg-[#151922] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 font-mono focus:border-indigo-500/40"
          />
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="bg-[#151922] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:border-indigo-500/40"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* CSV dropzone */}
        <div
          {...getRootProps()}
          className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-indigo-500/60 bg-indigo-500/5'
              : 'border-white/[0.1] hover:border-white/[0.2]'
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={16} className="mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">
            Drop a CSV file here, or click to select
          </p>
          <p className="text-[10px] font-mono text-slate-600 mt-1">
            Required column: <span className="text-indigo-400">input</span> · Optional: <span className="text-slate-400">expected_output</span>
          </p>
        </div>

        {parseError && (
          <p className="text-xs text-rose-400 font-mono">{parseError}</p>
        )}

        {/* Manual input */}
        <div>
          <p className="text-[10px] font-mono text-slate-600 mb-1.5">Or add test cases manually (one per line):</p>
          <div className="flex gap-2">
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="What is machine learning?&#10;Explain transformers..."
              rows={3}
              className="flex-1 bg-[#151922] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 resize-none focus:border-indigo-500/40"
            />
            <button
              onClick={addManual}
              disabled={!manualInput.trim()}
              className="px-3 py-2 bg-[#151922] border border-white/[0.08] rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-all self-start"
            >
              Add
            </button>
          </div>
        </div>

        {/* Test cases preview */}
        {testCases.length > 0 && (
          <div className="rounded-lg bg-[#151922] border border-white/[0.06] p-3">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-500">{testCases.length} test cases loaded</span>
              <button onClick={() => setTestCases([])} className="text-[10px] text-rose-400 hover:text-rose-300 font-mono">clear</button>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {testCases.slice(0, 5).map((tc, i) => (
                <p key={i} className="text-[10px] text-slate-500 truncate">
                  {i + 1}. {tc.input}
                </p>
              ))}
              {testCases.length > 5 && (
                <p className="text-[10px] text-slate-600 font-mono">...and {testCases.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={loading || !jobName || testCases.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all ${
            loading || !jobName || testCases.length === 0
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <Play size={12} />
          {loading ? 'STARTING...' : `RUN ${testCases.length} TEST CASES`}
        </button>
      </div>

      {/* Jobs list */}
      {jobs.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-widest text-slate-500">BATCH JOBS</span>
            <button onClick={refreshJobs} className="text-slate-600 hover:text-slate-400 transition-colors">
              <RefreshCw size={12} />
            </button>
          </div>
          <div>
            {jobs.map(job => (
              <button
                key={job.id}
                onClick={() => handleViewJob(job.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors text-left ${selectedJob === job.id ? 'bg-indigo-500/5' : ''}`}
              >
                <StatusIcon status={job.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-slate-300 truncate">{job.name}</p>
                  <p className="text-[10px] text-slate-600">
                    {job.model_name.split('/').pop()} · {job.test_case_count} cases
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs" style={{ color: job.avg_overall_score >= 0.7 ? '#10b981' : job.avg_overall_score >= 0.5 ? '#f59e0b' : '#f43f5e' }}>
                    {Math.round(job.avg_overall_score * 100)}/100
                  </p>
                  <p className="text-[10px] text-slate-600">{job.status}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Job detail */}
      {jobDetail && jobDetail.status === 'complete' && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14] overflow-hidden animate-fade-in">
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <span className="font-mono text-[10px] tracking-widest text-slate-500">
              RESULTS · {jobDetail.name}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['#', 'Input', 'Overall', 'Relevance', 'Faith.', 'Concise', 'Latency'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-[10px] text-slate-600 font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobDetail.results.map((r, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-slate-600">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{r.input}</td>
                    <td className="px-3 py-2"><ScoreCell value={r.scores?.overall     || 0} /></td>
                    <td className="px-3 py-2"><ScoreCell value={r.scores?.relevance   || 0} /></td>
                    <td className="px-3 py-2"><ScoreCell value={r.scores?.faithfulness|| 0} /></td>
                    <td className="px-3 py-2"><ScoreCell value={r.scores?.conciseness || 0} /></td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.latency_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
