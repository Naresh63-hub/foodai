import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { APP_VERSION } from '../config/version'
import {
  AppReleaseInfo,
  checkForAppUpdate,
  recordUpdateDismissal,
} from '../services/appUpdateService'

export function useAppUpdate(autoCheck = true) {
  const [releaseInfo, setReleaseInfo] = useState<AppReleaseInfo | null>(null)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const check = useCallback(
    async (manual = false) => {
      setIsChecking(true)
      try {
        const result = await checkForAppUpdate(APP_VERSION, manual)

        if (result.hasUpdate && result.latestRelease) {
          setHasUpdate(true)
          setReleaseInfo(result.latestRelease)
          if (manual || !result.isDismissed) {
            setIsModalOpen(true)
            if (manual) {
              toast.success(`New FoodAI version found: v${result.latestRelease.version}! 🚀`)
            }
          }
        } else {
          setHasUpdate(false)
          if (manual) {
            toast.info(`You're using the latest version of FoodAI (v${APP_VERSION}). ✓`)
          }
        }
      } catch {
        if (manual) {
          toast.error('Unable to check for updates right now. Please check your internet connection.')
        }
      } finally {
        setIsChecking(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!autoCheck) return

    // Defer background release check so initial page render & animations stay instant
    const timer = setTimeout(() => {
      check(false)
    }, 3500)

    return () => clearTimeout(timer)
  }, [autoCheck, check])

  const dismiss = useCallback(
    (remindLater = true) => {
      if (releaseInfo && remindLater) {
        recordUpdateDismissal(releaseInfo.version)
      }
      setIsModalOpen(false)
    },
    [releaseInfo]
  )

  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  return {
    currentVersion: APP_VERSION,
    releaseInfo,
    hasUpdate,
    isChecking,
    isModalOpen,
    openModal,
    closeModal: dismiss,
    checkForUpdates: check,
  }
}
