import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  onFile: (file: File) => void
  loading?: boolean
  accept?: Record<string, string[]>
  label?: string
  hint?: string
}

export function DropZone({
  onFile,
  loading = false,
  accept = { 'application/pdf': ['.pdf'] },
  label = 'Arraste o PDF aqui',
  hint = 'ou clique para selecionar — somente PDF',
}: DropZoneProps) {
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) {
        setCurrentFile(accepted[0])
        onFile(accepted[0])
      }
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    disabled: loading,
  })

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentFile(null)
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 select-none',
        'px-6 py-10',
        isDragActive
          ? 'border-brand-400 bg-brand-50 scale-[1.01]'
          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 bg-white',
        loading && 'pointer-events-none opacity-70'
      )}
    >
      <input {...getInputProps()} />

      {loading ? (
        <>
          <Loader2 size={32} className="text-brand-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Extraindo dados do PDF…</p>
        </>
      ) : currentFile ? (
        <>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <FileText size={22} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800">{currentFile.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {(currentFile.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            onClick={clear}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X size={12} className="text-slate-500" />
          </button>
        </>
      ) : (
        <>
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              isDragActive ? 'bg-brand-100' : 'bg-slate-100'
            )}
          >
            <UploadCloud size={22} className={isDragActive ? 'text-brand-600' : 'text-slate-400'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
          </div>
        </>
      )}
    </div>
  )
}
