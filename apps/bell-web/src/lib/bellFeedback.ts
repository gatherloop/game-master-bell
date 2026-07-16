/**
 * Tap feedback for the bell: a synthesized ring tone (Web Audio API, no binary
 * asset to ship) plus a short vibration on devices that support it. Per FR-W3
 * ("tap feedback... optional ring sound"); failures here must never break the
 * call flow, so every entry point swallows errors and no-ops when a browser
 * lacks the API (older Safari, desktop without haptics, etc).
 */

type AudioContextCtor = typeof AudioContext;

let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return undefined;
  audioContext ??= new Ctor();
  return audioContext;
}

// Inharmonic partials approximate a small bell's timbre better than a single tone.
const BELL_PARTIALS = [
  { frequency: 880, gain: 0.35 },
  { frequency: 1320, gain: 0.18 },
  { frequency: 2210, gain: 0.09 },
];
const RING_DECAY_SECONDS = 0.7;

/** Plays a short synthesized bell ring. No-ops if Web Audio is unavailable or blocked. */
export function playRingSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.5, now);
    master.connect(ctx.destination);

    for (const { frequency, gain } of BELL_PARTIALS) {
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);

      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(gain, now);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + RING_DECAY_SECONDS);

      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(now);
      oscillator.stop(now + RING_DECAY_SECONDS);
    }
  } catch {
    // Autoplay restrictions or an unavailable API — the visual ring still plays.
  }
}

const HAPTIC_PATTERN_MS = [30, 40, 30];

/** Fires a short haptic pulse. No-ops on devices/browsers without the Vibration API. */
export function vibrate(): void {
  try {
    navigator.vibrate?.(HAPTIC_PATTERN_MS);
  } catch {
    // Vibration API can throw in some embedded webviews — ignore.
  }
}

/** Plays the tap feedback (sound + haptics) together. */
export function playBellTapFeedback(): void {
  playRingSound();
  vibrate();
}
