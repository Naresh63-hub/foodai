import { APP_VERSION, GITHUB_RELEASES_API, GITHUB_RELEASES_PAGE } from '../config/version'

export interface AppReleaseInfo {
  version: string
  tagName: string
  name: string
  releaseNotes: string
  publishedAt: string
  apkDownloadUrl: string
  releasePageUrl: string
}

export interface AppUpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestRelease: AppReleaseInfo | null
  isDismissed: boolean
}

const DISMISSAL_STORAGE_KEY = 'foodai_dismissed_update_v1'

/**
 * Compares two semantic version strings (e.g. "1.0.1" and "1.0.0", or "v1.2.0" and "1.1.9").
 * Returns true if remoteVersion is strictly newer than currentVersion.
 */
export function isVersionNewer(currentVersion: string, remoteVersion: string): boolean {
  if (!remoteVersion || !currentVersion) return false

  const clean = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split('-')[0] // remove pre-release tags like -alpha or -beta for core comparison
      .split('.')
      .map((part) => {
        const num = parseInt(part, 10)
        return isNaN(num) ? 0 : num
      })

  const currentParts = clean(currentVersion)
  const remoteParts = clean(remoteVersion)
  const maxLen = Math.max(currentParts.length, remoteParts.length)

  for (let i = 0; i < maxLen; i++) {
    const cur = currentParts[i] || 0
    const rem = remoteParts[i] || 0
    if (rem > cur) return true
    if (rem < cur) return false
  }

  return false
}

/**
 * Checks if a specific version update was previously dismissed by the user within the cooldown period.
 */
export function isUpdateDismissed(version: string, cooldownHours = 24): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false
  try {
    const raw = localStorage.getItem(DISMISSAL_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (parsed.version !== version) return false

    const hoursElapsed = (Date.now() - parsed.timestamp) / (1000 * 60 * 60)
    return hoursElapsed < cooldownHours
  } catch {
    return false
  }
}

/**
 * Stores a dismissal timestamp for the specified version.
 */
export function recordUpdateDismissal(version: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.setItem(
      DISMISSAL_STORAGE_KEY,
      JSON.stringify({
        version,
        timestamp: Date.now(),
      })
    )
  } catch {}
}

/**
 * Clears any recorded dismissal to force a re-check.
 */
export function clearUpdateDismissal(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.removeItem(DISMISSAL_STORAGE_KEY)
  } catch {}
}

/**
 * Fetches the latest published release from GitHub Releases API with resilient timeout and error handling.
 */
export async function fetchLatestRelease(timeoutMs = 4500): Promise<AppReleaseInfo | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetch(GITHUB_RELEASES_API, {
      signal: controller?.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (!data || !data.tag_name) {
      return null
    }

    const tagName = String(data.tag_name || '')
    const cleanVersion = tagName.replace(/^v/i, '')
    const releaseName = data.name || `FoodAI Release ${tagName}`
    const releaseNotes =
      data.body ||
      '• Performance and stability enhancements.\n• Food scanning and nutrition accuracy updates.'

    // Look for an attached .apk asset
    let apkDownloadUrl = data.html_url || GITHUB_RELEASES_PAGE
    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const apkAsset = data.assets.find((asset: any) =>
        asset.name && asset.name.toLowerCase().endsWith('.apk')
      )
      if (apkAsset && apkAsset.browser_download_url) {
        apkDownloadUrl = apkAsset.browser_download_url
      }
    }

    return {
      version: cleanVersion,
      tagName,
      name: releaseName,
      releaseNotes,
      publishedAt: data.published_at || new Date().toISOString(),
      apkDownloadUrl,
      releasePageUrl: data.html_url || GITHUB_RELEASES_PAGE,
    }
  } catch {
    // Network errors or abort timeouts are handled gracefully without breaking the app
    return null
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/**
 * Checks if a newer version of FoodAI is available compared to the currently running version.
 */
export async function checkForAppUpdate(
  currentVersion: string = APP_VERSION,
  ignoreDismissal = false
): Promise<AppUpdateCheckResult> {
  const release = await fetchLatestRelease()

  if (!release) {
    return {
      hasUpdate: false,
      currentVersion,
      latestRelease: null,
      isDismissed: false,
    }
  }

  const hasUpdate = isVersionNewer(currentVersion, release.version)
  const isDismissed = !ignoreDismissal && isUpdateDismissed(release.version)

  return {
    hasUpdate,
    currentVersion,
    latestRelease: release,
    isDismissed,
  }
}
