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

/**
 * Resolves pseudo-protocols and relative CentralAuth URLs to full absolute URLs.
 * Supports:
 * - central-media://filename
 * - central-tts://filename
 * - central://filename (auto detects audio vs image/file by extension)
 * - /static/uploads/...
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

  if (trimmed.startsWith('central-media://')) {
    const filename = trimmed.slice('central-media://'.length)
    return ssoUrl ? `${ssoUrl}/static/uploads/media/${filename}` : `/static/uploads/media/${filename}`
  }

  if (trimmed.startsWith('central-tts://')) {
    const filename = trimmed.slice('central-tts://'.length)
    return ssoUrl ? `${ssoUrl}/static/uploads/tts/${filename}` : `/static/uploads/tts/${filename}`
  }

  if (trimmed.startsWith('central://')) {
    const filename = trimmed.slice('central://'.length)
    const isAudio = /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(filename)
    const folder = isAudio ? 'tts' : 'media'
    return ssoUrl ? `${ssoUrl}/static/uploads/${folder}/${filename}` : `/static/uploads/${folder}/${filename}`
  }

  if (trimmed.startsWith('/static/uploads/')) {
    return ssoUrl ? `${ssoUrl}${trimmed}` : trimmed
  }

  return trimmed
}

/**
 * Helper to convert full or relative CentralAuth URLs to canonical pseudo-protocols:
 * - /static/uploads/tts/file.mp3 -> central-tts://file.mp3
 * - /static/uploads/media/file.png -> central-media://file.png
 */
export const unresolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (
    trimmed.startsWith('central-media://') ||
    trimmed.startsWith('central-tts://') ||
    trimmed.startsWith('central://')
  ) {
    return trimmed
  }

  // Audio TTS regex: e.g. (domain)/static/uploads/tts/<filename>
  const ttsMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/static\/uploads\/tts\/([^\s?#]+)/)
  if (ttsMatch && ttsMatch[1]) {
    return `central-tts://${ttsMatch[1]}`
  }

  // General Media regex: e.g. (domain)/static/uploads/media/<filename>
  const mediaMatch = trimmed.match(/(?:https?:\/\/[^\/]+)?\/static\/uploads\/media\/([^\s?#]+)/)
  if (mediaMatch && mediaMatch[1]) {
    return `central-media://${mediaMatch[1]}`
  }

  return trimmed
}
