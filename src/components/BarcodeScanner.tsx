import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface BarcodeScannerProps {
  active: boolean
  onDetected: (value: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ active, onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active || !videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    let disposed = false

    const start = async () => {
      try {
        await reader.decodeFromVideoDevice(null, videoRef.current!, (result, scanError) => {
          if (disposed) return
          if (result) {
            onDetected(result.getText())
            return
          }
          if (scanError && !(scanError instanceof NotFoundException)) {
            setError(scanError.message)
          }
        })
      } catch (scanError) {
        setError(scanError instanceof Error ? scanError.message : 'Unable to access the camera.')
      }
    }

    void start()

    return () => {
      disposed = true
      reader.reset()
    }
  }, [active, onDetected])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Scan barcode</h3>
            <p className="text-sm text-slate-500">Point the camera at the parcel barcode.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-slate-950">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Camera className="h-4 w-4" />
            Camera scan is active
          </div>
          <p className="mt-2">USB HID barcode readers also work on the parcel screen by scanning and pressing Enter.</p>
          {error ? <p className="mt-2 text-sm font-medium text-rose-600">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
