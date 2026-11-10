import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  isVersionNewer,
  isUpdateDismissed,
  recordUpdateDismissal,
  clearUpdateDismissal,
  fetchLatestRelease,
  checkForAppUpdate,
} from '../services/appUpdateService'
import UpdateReleaseModal from '../components/UpdateReleaseModal'

describe('appUpdateService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('isVersionNewer', () => {
    it('detects newer patch, minor, and major versions', () => {
      expect(isVersionNewer('1.0.0', '1.0.1')).toBe(true)
      expect(isVersionNewer('1.0.0', '1.1.0')).toBe(true)
      expect(isVersionNewer('1.9.9', '2.0.0')).toBe(true)
      expect(isVersionNewer('1.9.0', '1.10.0')).toBe(true)
    })

    it('handles "v" prefix correctly', () => {
      expect(isVersionNewer('v1.0.0', 'v1.0.1')).toBe(true)
      expect(isVersionNewer('1.0.0', 'v1.0.2')).toBe(true)
      expect(isVersionNewer('v1.2.0', '1.2.1')).toBe(true)
    })

    it('returns false for equal or older versions', () => {
      expect(isVersionNewer('1.0.0', '1.0.0')).toBe(false)
      expect(isVersionNewer('1.0.2', '1.0.1')).toBe(false)
      expect(isVersionNewer('2.0.0', '1.9.9')).toBe(false)
    })

    it('handles pre-release tags and suffixes', () => {
      expect(isVersionNewer('1.0.0', '1.0.1-beta')).toBe(true)
      expect(isVersionNewer('1.0.1-rc1', '1.0.1')).toBe(false)
    })

    it('returns false for invalid or empty inputs', () => {
      expect(isVersionNewer('', '1.0.0')).toBe(false)
      expect(isVersionNewer('1.0.0', '')).toBe(false)
      expect(isVersionNewer('', '')).toBe(false)
    })
  })

  describe('Dismissal storage', () => {
    it('returns false when no dismissal has been recorded', () => {
      expect(isUpdateDismissed('1.0.1')).toBe(false)
    })

    it('records dismissal and returns true within cooldown period', () => {
      recordUpdateDismissal('1.0.1')
      expect(isUpdateDismissed('1.0.1')).toBe(true)
      expect(isUpdateDismissed('1.0.2')).toBe(false) // Different version
    })

    it('returns false after cooldown period expires', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      recordUpdateDismissal('1.0.1')
      expect(isUpdateDismissed('1.0.1', 24)).toBe(true)

      // Fast forward 25 hours
      vi.spyOn(Date, 'now').mockReturnValue(now + 25 * 60 * 60 * 1000)
      expect(isUpdateDismissed('1.0.1', 24)).toBe(false)
    })

    it('clears dismissal correctly', () => {
      recordUpdateDismissal('1.0.1')
      expect(isUpdateDismissed('1.0.1')).toBe(true)
      clearUpdateDismissal()
      expect(isUpdateDismissed('1.0.1')).toBe(false)
    })
  })

  describe('fetchLatestRelease', () => {
    it('returns null when GitHub API responds with non-200 status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any)

      const result = await fetchLatestRelease()
      expect(result).toBeNull()
    })

    it('returns null when fetch throws network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchLatestRelease()
      expect(result).toBeNull()
    })

    it('parses valid GitHub release with APK asset', async () => {
      const mockPayload = {
        tag_name: 'v1.0.1',
        name: 'FoodAI v1.0.1 Release',
        body: '• New official FoodAI icon\n• Google Sign-In fixes',
        html_url: 'https://github.com/Naresh63-hub/foodai/releases/tag/v1.0.1',
        published_at: '2026-11-10T00:00:00Z',
        assets: [
          {
            name: 'foodai-release.apk',
            browser_download_url: 'https://github.com/Naresh63-hub/foodai/releases/download/v1.0.1/app-debug.apk',
          },
        ],
      }

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockPayload,
      } as any)

      const result = await fetchLatestRelease()
      expect(result).not.toBeNull()
      expect(result?.version).toBe('1.0.1')
      expect(result?.tagName).toBe('v1.0.1')
      expect(result?.name).toBe('FoodAI v1.0.1 Release')
      expect(result?.apkDownloadUrl).toBe(
        'https://github.com/Naresh63-hub/foodai/releases/download/v1.0.1/app-debug.apk'
      )
    })
  })

  describe('checkForAppUpdate', () => {
    it('flags hasUpdate true when remote release is newer and not dismissed', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tag_name: 'v1.1.0',
          name: 'FoodAI v1.1.0',
          body: 'Update notes',
          html_url: 'https://github.com/Naresh63-hub/foodai/releases/tag/v1.1.0',
          assets: [],
        }),
      } as any)

      const result = await checkForAppUpdate('1.0.0')
      expect(result.hasUpdate).toBe(true)
      expect(result.isDismissed).toBe(false)
      expect(result.latestRelease?.version).toBe('1.1.0')
    })
  })
})

describe('UpdateReleaseModal Component', () => {
  const mockRelease = {
    version: '1.0.1',
    tagName: 'v1.0.1',
    name: 'FoodAI v1.0.1 Official Release',
    releaseNotes: '• Android official launcher icon\n• Google Sign-in improvements',
    publishedAt: '2026-11-10T00:00:00Z',
    apkDownloadUrl: 'https://example.com/foodai.apk',
    releasePageUrl: 'https://example.com/releases/v1.0.1',
  }

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <UpdateReleaseModal isOpen={false} onClose={vi.fn()} releaseInfo={mockRelease} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders update modal with version and release notes when isOpen is true', () => {
    render(<UpdateReleaseModal isOpen={true} onClose={vi.fn()} releaseInfo={mockRelease} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Update FoodAI')).toBeInTheDocument()
    expect(screen.getByText('New: v1.0.1')).toBeInTheDocument()
    expect(screen.getByText('Android official launcher icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download & Install APK/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Remind Me Later/i })).toBeInTheDocument()
  })

  it('handles Download button click by opening download URL and closing without remindLater', () => {
    const onClose = vi.fn()
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<UpdateReleaseModal isOpen={true} onClose={onClose} releaseInfo={mockRelease} />)

    const downloadBtn = screen.getByRole('button', { name: /Download & Install APK/i })
    fireEvent.click(downloadBtn)

    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/foodai.apk', '_blank')
    expect(onClose).toHaveBeenCalledWith(false)
  })

  it('handles Remind Me Later button click by calling onClose with true', () => {
    const onClose = vi.fn()
    render(<UpdateReleaseModal isOpen={true} onClose={onClose} releaseInfo={mockRelease} />)

    const remindBtn = screen.getByRole('button', { name: /Remind Me Later/i })
    fireEvent.click(remindBtn)

    expect(onClose).toHaveBeenCalledWith(true)
  })
})
