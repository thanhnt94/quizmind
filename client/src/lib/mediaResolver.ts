import { useAppStore } from '../store/useAppStore'

let cachedCentralAuthUrl: string = ''

export const setCentralAuthUrl = (url: string) => {
  if (url && typeof url === 'string') {
    cachedCentralAuthUrl = url.trim().replace(/\/$/, '')
  }
}

export const getCentralAuthUrl = (): string => {
  if (cachedCentralAuthUrl) return cachedCentralAuthUrl

  // 1. Check useAppStore
  try {
    const appCfg = useAppStore.getState().authConfig
    if (appCfg?.central_auth_url) {
      cachedCentralAuthUrl = appCfg.central_auth_url.trim().replace(/\/$/, '')
      return cachedCentralAuthUrl
    }
    if (appCfg?.server_url) {
      cachedCentralAuthUrl = appCfg.server_url.trim().replace(/\/$/, '')
      return cachedCentralAuthUrl
    }
    if (appCfg?.jump_url) {
      try {
        const u = new URL(appCfg.jump_url)
        cachedCentralAuthUrl = u.origin
        return cachedCentralAuthUrl
      } catch {}
    }
  } catch {}

  // 2. Check Vite environment variable
  try {
    const envUrl = (
      (import.meta as any).env?.VITE_SSO_SERVER_URL ||
      (import.meta as any).env?.VITE_CENTRAL_AUTH_URL ||
      ''
    ).trim().replace(/\/$/, '')
    if (envUrl) {
      cachedCentralAuthUrl = envUrl
      return cachedCentralAuthUrl
    }
  } catch {}

  // 3. Fallback to production default
  return 'https://auth.inmind.site'
}

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'aac', 'webm', 'flac'])

/**
 * Resolves pseudo-protocols and relative CentralAuth URLs to full absolute URLs.
 * Supports:
 * - central://filename.ext -> auto-detects audio (tts) vs general media (media) under /static/uploads/
 * - central://folder/filename.ext -> resolves to /static/folder/filename.ext (or /static/uploads/ if folder is tts/media)
 * - legacy central-media://filename -> /static/uploads/media/filename
 * - legacy central-tts://filename -> /static/uploads/tts/filename
 * - /static/... -> prepends ssoUrl
 */
export const resolveMediaUrl = (url: string | null | undefined, customBaseUrl?: string): string => {
  if (!url) return ''
  let trimmed = url.trim()
  if (!trimmed) return ''

  const ssoUrl = (customBaseUrl || getCentralAuthUrl()).replace(/\/$/, '')

  // Correct any legacy/mismatched domains pointing to old subdomains
  if (ssoUrl && (trimmed.includes('auth.inmind.site') || trimmed.includes('centralauth.inmind.site') || trimmed.includes('centralauth.mindstack.local'))) {
    trimmed = trimmed.replace(/https?:\/\/(?:auth|centralauth)\.inmind\.site/g, ssoUrl)
    trimmed = trimmed.replace(/http:\/\/centralauth\.mindstack\.local/g, ssoUrl)
  }

  // 1. Unified central:// protocol
  if (trimmed.startsWith('central://')) {
    const path = trimmed.slice('central://'.length).replace(/^\/+/, '')
    if (path.includes('/')) {
      if (path.startsWith('static/')) {
        return ssoUrl ? `${ssoUrl}/${path}` : `/${path}`
      } else if (path.startsWith('uploads/')) {
        return ssoUrl ? `${ssoUrl}/static/${path}` : `/static/${path}`
      } else if (path.startsWith('tts/') || path.startsWith('media/')) {
        return ssoUrl ? `${ssoUrl}/static/uploads/${path}` : `/static/uploads/${path}`
      } else {
        // Direct subfolder under static (e.g. static/<folder>/<filename>)
        return ssoUrl ? `${ssoUrl}/static/${path}` : `/static/${path}`
      }
    } else {
      const ext = path.split('.').pop()?.toLowerCase() || ''
      const subfolder = AUDIO_EXTENSIONS.has(ext) ? 'tts' : 'media'
      return ssoUrl ? `${ssoUrl}/static/uploads/${subfolder}/${path}` : `/static/uploads/${subfolder}/${path}`
    }
  }

  // 2. Legacy central-media://
  if (trimmed.startsWith('central-media://')) {
    const filename = trimmed.slice('central-media://'.length).replace(/^\/+/, '')
    return ssoUrl ? `${ssoUrl}/static/uploads/media/${filename}` : `/static/uploads/media/${filename}`
  }

  // 3. Legacy central-tts://
  if (trimmed.startsWith('central-tts://')) {
    const filename = trimmed.slice('central-tts://'.length).replace(/^\/+/, '')
    return ssoUrl ? `${ssoUrl}/static/uploads/tts/${filename}` : `/static/uploads/tts/${filename}`
  }

  // 4. Relative paths /static/
  if (trimmed.startsWith('/static/')) {
    return ssoUrl ? `${ssoUrl}${trimmed}` : trimmed
  }

  return trimmed
}

/**
 * Helper to convert full or relative CentralAuth URLs to the unified canonical pseudo-protocol:
 * `central://<filename>` or `central://<folder>/<filename>`
 */
export const unresolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Already central://
  if (trimmed.startsWith('central://')) {
    return trimmed
  }

  // Convert legacy central-media:// -> central://
  if (trimmed.startsWith('central-media://')) {
    const filename = trimmed.slice('central-media://'.length).replace(/^\/+/, '')
    return `central://${filename}`
  }

  // Convert legacy central-tts:// -> central://
  if (trimmed.startsWith('central-tts://')) {
    const filename = trimmed.slice('central-tts://'.length).replace(/^\/+/, '')
    return `central://${filename}`
  }

  // Audio TTS regex: /static/uploads/tts/<filename> -> central://<filename>
  const ttsMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/static\/uploads\/tts\/([^\s?#]+)/)
  if (ttsMatch && ttsMatch[1]) {
    return `central://${ttsMatch[1]}`
  }

  // General Media regex: /static/uploads/media/<filename> -> central://<filename>
  const mediaMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/static\/uploads\/media\/([^\s?#]+)/)
  if (mediaMatch && mediaMatch[1]) {
    return `central://${mediaMatch[1]}`
  }

  // General static/uploads/<folder>/<filename>
  const uploadsMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/static\/uploads\/([^\s?#]+)/)
  if (uploadsMatch && uploadsMatch[1]) {
    return `central://uploads/${uploadsMatch[1]}`
  }

  // General static/<folder>/<filename>
  const staticMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/static\/([^\s?#]+)/)
  if (staticMatch && staticMatch[1]) {
    return `central://${staticMatch[1]}`
  }

  return trimmed
}
