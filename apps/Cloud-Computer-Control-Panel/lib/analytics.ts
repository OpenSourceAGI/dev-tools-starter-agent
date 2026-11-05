// Amplitude analytics + Session Replay, browser only.
//
// Everything here is a no-op when NEXT_PUBLIC_AMPLITUDE_API_KEY is unset, so
// local dev and self-hosted installs send nothing unless they opt in.
import * as amplitude from "@amplitude/analytics-browser"
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser"

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY

// 1 records every session (useful while verifying capture). Lower it for
// production, e.g. 0.1 for ~10% of sessions.
function replaySampleRate(): number {
  const raw = process.env.NEXT_PUBLIC_AMPLITUDE_REPLAY_SAMPLE_RATE
  const rate = raw ? Number(raw) : NaN
  return rate >= 0 && rate <= 1 ? rate : 1
}

let initializationPromise: Promise<void> | undefined

function normalizeUserId(userId: unknown): string | undefined {
  if (userId === null || userId === undefined || userId === "") return undefined
  return String(userId)
}

export function isAnalyticsEnabled(): boolean {
  return typeof window !== "undefined" && Boolean(AMPLITUDE_API_KEY)
}

export function initializeAnalytics(userId?: string | null): Promise<void> {
  if (!isAnalyticsEnabled()) return Promise.resolve()

  if (!initializationPromise) {
    initializationPromise = (async () => {
      // The replay plugin must be registered before init.
      await amplitude.add(
        sessionReplayPlugin({
          sampleRate: replaySampleRate(),
          // This app shows cloud credentials and infrastructure details, so
          // replays mask all text and inputs by default.
          privacyConfig: { defaultMaskLevel: "conservative" },
        }),
      ).promise

      await amplitude.init(AMPLITUDE_API_KEY as string, normalizeUserId(userId), {
        autocapture: true,
      }).promise
    })()
  }

  return initializationPromise
}

export async function identifyUser(userId: string): Promise<void> {
  const id = normalizeUserId(userId)
  if (!id) throw new Error("identifyUser requires the application's user ID.")
  if (!isAnalyticsEnabled()) return

  await initializeAnalytics(id)
  if (amplitude.getUserId() === id) return

  amplitude.setUserId(id)
  amplitude.track("User Identified")
}

export async function trackEvent(eventName: string, properties: Record<string, unknown> = {}): Promise<void> {
  if (!isAnalyticsEnabled()) return
  await initializeAnalytics()
  amplitude.track(eventName, properties)
}

export async function clearUser(): Promise<void> {
  if (!isAnalyticsEnabled()) return
  await initializeAnalytics()
  // Already signed out (e.g. sign-out handler and session watcher both fired).
  if (!amplitude.getUserId()) return
  // Clears the user ID and rotates the device ID so the next person on a
  // shared browser is not attributed to the previous account.
  amplitude.reset()
}
