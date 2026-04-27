import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

function getCanvasPoint(canvas: HTMLCanvasElement, e: PointerEvent) {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  return { x, y }
}

function ensureHiDpi(canvas: HTMLCanvasElement) {
  const ratio = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const w = Math.max(1, Math.floor(rect.width))
  const h = Math.max(1, Math.floor(rect.height))
  const dw = Math.floor(w * ratio)
  const dh = Math.floor(h * ratio)
  if (canvas.width !== dw || canvas.height !== dh) {
    canvas.width = dw
    canvas.height = dh
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  }
}

export function SignaturePad({
  label,
  value,
  onChange,
  className,
  height = 140,
  disabled = false,
  hideHeader = false,
}: {
  label: string
  value: string
  onChange: (dataUrl: string) => void
  className?: string
  height?: number | string
  disabled?: boolean
  hideHeader?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [last, setLast] = useState<{ x: number; y: number } | null>(null)

  const hasValue = useMemo(() => !!value && value.startsWith('data:image/'), [value])

  const redraw = (dataUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    ensureHiDpi(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    if (!dataUrl) return
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
    }
    img.src = dataUrl
  }

  useEffect(() => {
    redraw(value)
  }, [value])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    ensureHiDpi(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [])

  const emit = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = Math.max(1, Math.floor(rect.width))
    exportCanvas.height = Math.max(1, Math.floor(rect.height))
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height)
    onChange(exportCanvas.toDataURL('image/png'))
  }

  const clear = () => {
    if (disabled) return
    onChange('')
    redraw('')
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onPointerDown = (e: PointerEvent) => {
      if (disabled) return
      canvas.setPointerCapture(e.pointerId)
      ensureHiDpi(canvas)
      setDrawing(true)
      setLast(getCanvasPoint(canvas, e))
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!drawing || disabled) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const p = getCanvasPoint(canvas, e)
      const prev = last
      if (!prev) return
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      setLast(p)
    }

    const end = () => {
      if (!drawing) return
      setDrawing(false)
      setLast(null)
      emit()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', end)
    canvas.addEventListener('pointercancel', end)
    canvas.addEventListener('pointerleave', end)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', end)
      canvas.removeEventListener('pointercancel', end)
      canvas.removeEventListener('pointerleave', end)
    }
  }, [drawing, last, disabled])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!hideHeader && (
        <div className="flex items-center justify-between gap-3">
          <label className="label">{label}</label>
          <button
            type="button"
            className="btn-ghost p-2 min-h-0 text-xs"
            onClick={clear}
            disabled={disabled || !hasValue}
            title="Limpar"
          >
            Limpar
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white',
          disabled ? 'opacity-70' : 'touch-none'
        )}
        style={{ height }}
      />
      {hideHeader && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-ghost p-2 min-h-0 text-xs"
            onClick={clear}
            disabled={disabled || !hasValue}
            title="Limpar"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  )
}
