import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadDocument, listDocuments, deleteDocument } from '../utils/api'
import { FileText, Trash2, Upload, CheckCircle } from 'lucide-react'

export default function DocumentUploader() {
  const [docs,     setDocs]     = useState([])
  const [uploading,setUploading]= useState(false)
  const [progress, setProgress] = useState(0)
  const [last,     setLast]     = useState(null)
  const [error,    setError]    = useState(null)

  const refresh = useCallback(() => {
    listDocuments().then(d => setDocs(d.documents || [])).catch(() => {})
  }, [])

  React.useEffect(() => { refresh() }, [refresh])

  const onDrop = useCallback(async files => {
    setUploading(true); setError(null); setLast(null)
    for (const file of files) {
      try {
        const r = await uploadDocument(file, setProgress)
        setLast(r)
        refresh()
      } catch (e) {
        setError(e.response?.data?.detail || 'Upload failed')
      }
    }
    setUploading(false); setProgress(0)
  }, [refresh])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] },
    disabled: uploading,
  })

  const handleDelete = async filename => {
    await deleteDocument(filename).catch(() => {})
    refresh()
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-indigo-500/60 bg-indigo-500/5' : 'border-white/[0.08] hover:border-white/[0.16]'
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={18} className="mx-auto text-slate-600 mb-2" />
        <p className="text-xs text-slate-500">Drop files or click to upload</p>
        <p className="text-[10px] font-mono text-slate-700 mt-1">.pdf · .txt · .md</p>
      </div>

      {/* Progress */}
      {uploading && (
        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
            <span>Indexing...</span><span className="text-indigo-400">{progress}%</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {last && !uploading && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
          <CheckCircle size={12} />
          {last.filename} · {last.chunks} chunks indexed
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400 font-mono p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/20">{error}</p>
      )}

      {/* Doc list */}
      {docs.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-slate-600 tracking-widest">INDEXED · {docs.length}</p>
          {docs.map(f => (
            <div key={f} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#151922] border border-white/[0.05]">
              <FileText size={12} className="text-indigo-400 flex-shrink-0" />
              <span className="flex-1 text-xs text-slate-400 truncate font-mono">{f}</span>
              <button onClick={() => handleDelete(f)} className="text-slate-700 hover:text-rose-400 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !uploading && <p className="text-[10px] font-mono text-slate-700 text-center py-2">// no documents indexed</p>
      )}
    </div>
  )
}
