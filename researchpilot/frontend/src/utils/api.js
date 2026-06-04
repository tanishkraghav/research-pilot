import axios from 'axios'

// Get API base URL from environment or default to relative path
const getApiBaseUrl = () => {
  // In production (Netlify), use VITE_API_URL if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // In development, use relative path (proxied by vite)
  return '/api'
}

const API_BASE_URL = getApiBaseUrl()
const api = axios.create({ baseURL: API_BASE_URL, timeout: 120000 })

// ── Research ───────────────────────────────────────────────────────────────────

export const streamResearch = (request, onTrace, onResult, onError) => {
  const params = new URLSearchParams()
  // POST via fetch for SSE
  const url = `${API_BASE_URL}/research`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }).then(response => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const read = () => {
      reader.read().then(({ done, value }) => {
        if (done) return
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') return
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'trace') onTrace(parsed.data)
            if (parsed.type === 'result') onResult(parsed.data)
            if (parsed.type === 'error') onError(parsed.data.message)
          } catch {}
        }
        read()
      }).catch(err => onError(err.message))
    }
    read()
  }).catch(err => onError(err.message))
}

export const getSessions = () => api.get('/research/sessions').then(r => r.data)
export const getSession  = id => api.get(`/research/sessions/${id}`).then(r => r.data)

// ── Eval ───────────────────────────────────────────────────────────────────────

export const compareModels   = body   => api.post('/eval/compare', body).then(r => r.data)
export const getEvalHistory  = ()     => api.get('/eval/history').then(r => r.data)
export const getEvalStats    = ()     => api.get('/eval/stats').then(r => r.data)
export const startBatchEval  = body   => api.post('/eval/batch', body).then(r => r.data)
export const getBatchJobs    = ()     => api.get('/eval/batch').then(r => r.data)
export const getBatchJob     = id     => api.get(`/eval/batch/${id}`).then(r => r.data)

// ── Prompts ────────────────────────────────────────────────────────────────────

export const createPrompt    = body         => api.post('/prompts', body).then(r => r.data)
export const listPrompts     = ()           => api.get('/prompts').then(r => r.data)
export const getVersions     = name         => api.get(`/prompts/${name}/versions`).then(r => r.data)
export const getDiff         = (name, v1, v2) => api.get(`/prompts/${name}/diff?v1=${v1}&v2=${v2}`).then(r => r.data)

// ── Documents ──────────────────────────────────────────────────────────────────

export const uploadDocument  = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded * 100 / e.total)),
  }).then(r => r.data)
}
export const listDocuments   = () => api.get('/documents').then(r => r.data)
export const deleteDocument  = filename => api.delete(`/documents/${encodeURIComponent(filename)}`).then(r => r.data)

// ── Export ─────────────────────────────────────────────────────────────────────
export const exportMarkdown = id => `${API_BASE_URL}/export/markdown/${id}`
export const exportPDF = id => `${API_BASE_URL}/export/pdf/${id}`

// ── Health ─────────────────────────────────────────────────────────────────────

export const getHealth       = () => api.get('/health').then(r => r.data)
