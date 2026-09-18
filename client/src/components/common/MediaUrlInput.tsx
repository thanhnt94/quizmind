import React, { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import {
  Upload,
  Image as ImageIcon,
  Music,
  Loader2,
  Check,
  X,
  Play,
  Pause,
  Maximize2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { resolveMediaUrl, unresolveMediaUrl } from '@/lib/mediaResolver'

export interface MediaUrlInputProps {
  value: string
  onChange: (val: string) => void
  mediaType: 'image' | 'audio' | 'all'
  placeholder?: string
  label?: string
  sublabel?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  required?: boolean
  showPreview?: boolean
}

export const MediaUrlInput: React.FC<MediaUrlInputProps> = ({
  value,
  onChange,
  mediaType,
  placeholder,
  label,
  sublabel,
  className,
  inputClassName,
  disabled = false,
  required = false,
  showPreview = true,
}) => {
  const centralAuthUrl = useAppStore((state) => state.authConfig?.central_auth_url)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const acceptTypes =
    mediaType === 'image'
      ? 'image/*'
      : mediaType === 'audio'
      ? 'audio/*'
      : 'image/*,audio/*'

  const defaultPlaceholder =
    placeholder ||
    (mediaType === 'image'
      ? 'Paste URL, drop file, or Ctrl+V image...'
      : mediaType === 'audio'
      ? 'Paste URL or upload audio...'
      : 'Paste URL or upload media...')

  // Upload function to QuizMind -> CentralAuth Vault
  const uploadFile = useCallback(
    async (file: File) => {
      if (!file) return

      // Validate file type
      if (mediaType === 'image' && !file.type.startsWith('image/')) {
        setUploadStatus('error')
        setStatusMessage('Please select an image file (.png, .jpg, .webp...)')
        setTimeout(() => setUploadStatus('idle'), 3500)
        return
      }
      if (mediaType === 'audio' && !file.type.startsWith('audio/')) {
        setUploadStatus('error')
        setStatusMessage('Please select an audio file (.mp3, .wav, .m4a...)')
        setTimeout(() => setUploadStatus('idle'), 3500)
        return
      }

      setIsUploading(true)
      setUploadStatus('idle')
      setStatusMessage('Uploading to CentralAuth...')

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await axios.post('/api/v1/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        if (res.data?.url || res.data?.canonical_url) {
          const canonical = unresolveMediaUrl(res.data.canonical_url || res.data.url)
          onChange(canonical)
          setUploadStatus('success')
          setStatusMessage('Uploaded to CentralAuth!')
          setTimeout(() => setUploadStatus('idle'), 3000)
        } else {
          throw new Error('Server returned no file URL')
        }
      } catch (err: any) {
        console.error('[MediaUrlInput] Upload error:', err)
        setUploadStatus('error')
        const errMsg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          'Upload failed'
        setStatusMessage(errMsg)
        setTimeout(() => setUploadStatus('idle'), 4000)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [mediaType, onChange]
  )

  // Trigger file selection dialog
  const handleTriggerUpload = () => {
    if (disabled || isUploading) return
    fileInputRef.current?.click()
  }

  // Handle native file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFile(file)
  }

  // Handle Clipboard Paste (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // Check for image from clipboard
      if (item.type.startsWith('image/') && (mediaType === 'image' || mediaType === 'all')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          uploadFile(file)
          return
        }
      }

      // Check for audio file from clipboard
      if (item.type.startsWith('audio/') && (mediaType === 'audio' || mediaType === 'all')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          uploadFile(file)
          return
        }
      }
    }

    // Check for text paste and auto-canonicalize CentralAuth URLs
    const pastedText = e.clipboardData?.getData('text')
    if (pastedText) {
      const normalized = unresolveMediaUrl(pastedText)
      if (normalized !== pastedText) {
        e.preventDefault()
        onChange(normalized)
        return
      }
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled || isUploading) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  // Toggle audio preview
  const toggleAudio = () => {
    if (!audioRef.current) return
    const currentResolved = resolveMediaUrl(value, centralAuthUrl)
    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      if (audioRef.current.src !== currentResolved) {
        audioRef.current.src = currentResolved
      }
      audioRef.current.load()
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((err) => {
          console.error('Audio play failed:', err)
          setIsPlayingAudio(false)
        })
    }
  }

  const resolvedUrl = resolveMediaUrl(value, centralAuthUrl)
  const isImage =
    mediaType === 'image' ||
    (mediaType === 'all' &&
      (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(value) ||
        value.includes('/static/uploads/media/') ||
        value.startsWith('central-media://')))
  const isAudio =
    mediaType === 'audio' ||
    (mediaType === 'all' &&
      (/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(value) ||
        value.includes('/static/uploads/tts/') ||
        value.startsWith('central-tts://')))

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Label & Sublabel */}
      {(label || sublabel) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
          )}
          {sublabel && (
            <span className="text-[9px] font-bold text-slate-400">{sublabel}</span>
          )}
        </div>
      )}

      {/* Input container with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex items-center rounded-xl transition-all border',
          isDragging
            ? 'border-dashed border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
            : 'border-slate-200/90 bg-white hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20'
        )}
      >
        {/* Leading Media Icon */}
        <div className="pl-3 pr-1 text-slate-400 shrink-0 select-none">
          {mediaType === 'image' ? (
            <ImageIcon className="w-3.5 h-3.5" />
          ) : mediaType === 'audio' ? (
            <Music className="w-3.5 h-3.5" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Text Input (supports typing URL, pasting URL, or Ctrl+V image/audio) */}
        <input
          type="text"
          value={unresolveMediaUrl(value) || ''}
          onChange={(e) => onChange(unresolveMediaUrl(e.target.value))}
          onPaste={handlePaste}
          disabled={disabled || isUploading}
          placeholder={isUploading ? 'Uploading file...' : defaultPlaceholder}
          className={cn(
            'w-full py-2.5 px-2 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 placeholder:font-normal truncate',
            inputClassName
          )}
        />

        {/* Clear Button */}
        {value && !disabled && !isUploading && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 mr-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Clear URL"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Upload Button */}
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={handleTriggerUpload}
          className={cn(
            'flex items-center gap-1.5 mr-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer',
            isUploading
              ? 'bg-indigo-50 text-indigo-500 cursor-not-allowed'
              : uploadStatus === 'success'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : uploadStatus === 'error'
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 active:scale-95'
          )}
          title={
            mediaType === 'image'
              ? 'Upload image (or drop / Ctrl+V)'
              : 'Upload audio file'
          }
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
              <span className="hidden sm:inline">Uploading...</span>
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">Uploaded</span>
            </>
          ) : (
            <>
              <Upload className="w-3 h-3" />
              <span>Upload</span>
            </>
          )}
        </button>

        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Micro-Notification Toast for Upload Status */}
      {statusMessage && (
        <div
          className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1',
            uploadStatus === 'success'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : uploadStatus === 'error'
              ? 'text-rose-700 bg-rose-50 border border-rose-200'
              : 'text-indigo-700 bg-indigo-50 border border-indigo-200'
          )}
        >
          {isUploading && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
          {uploadStatus === 'success' && <Check className="w-2.5 h-2.5" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Media Preview Section */}
      {showPreview && value && resolvedUrl && (
        <div className="pt-1">
          {/* Image Preview */}
          {isImage && (
            <div className="relative group inline-block">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 flex items-center justify-center shadow-xs">
                <img
                  src={resolvedUrl}
                  alt="Preview"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none'
                  }}
                />
                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="p-1.5 rounded-xl bg-black/60 hover:bg-black/90 text-white transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Zoom preview"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Preview */}
          {isAudio && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80 max-w-sm">
              <button
                type="button"
                onClick={toggleAudio}
                className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title={isPlayingAudio ? 'Pause' : 'Play'}
              >
                {isPlayingAudio ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-700 block truncate">
                  {value.split('/').pop() || 'Audio file'}
                </span>
                <span className="text-[8.5px] font-medium text-slate-400 block truncate">
                  Click to preview
                </span>
              </div>
              <audio
                ref={audioRef}
                src={resolvedUrl}
                onPlay={() => setIsPlayingAudio(true)}
                onPause={() => setIsPlayingAudio(false)}
                onEnded={() => setIsPlayingAudio(false)}
                onError={(e) => {
                  console.warn('Audio preview error for URL:', resolvedUrl, e)
                  setIsPlayingAudio(false)
                }}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* Image Zoom Modal */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl border border-white/10"
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/60 hover:bg-black/90 text-white rounded-full flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={resolvedUrl}
              alt="Zoomed preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default MediaUrlInput
