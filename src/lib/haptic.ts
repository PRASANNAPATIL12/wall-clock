/**
 * Haptic feedback — fires a single "tick" pulse for UI confirmation moments
 * (e.g. each minute crossed while the user is dragging the focus-ring end
 * point along the dial).
 *
 * Priority order:
 *   1. Vibration via navigator.vibrate(8 ms) on devices with a touchscreen
 *      AND a vibration motor (most Android phones). On these, the user
 *      feels a small click through the device.
 *   2. Web Audio fallback — a brief 1 100 Hz sine click at low volume
 *      (~6 % gain), 50 ms total, sharp attack and exponential release.
 *      Used on iOS Safari (where vibrate exists but is a no-op) and on
 *      desktop browsers (where there is no vibration hardware).
 *   3. Visual pulse on the dragged element — handled by the component
 *      using Web Animations API, always runs regardless of haptic path.
 *
 * Throttled to one tick every 30 ms so fast drags don't stutter.
 * Honors `wall.haptic.silent === 'true'` in localStorage to disable.
 *
 * AudioContext is created lazily on the FIRST tick — that first tick is
 * always inside a user gesture (pointer-down/move), so autoplay rules
 * don't block initialization.
 */

let audioCtx: AudioContext | null = null;
let lastTickMs = 0;
const MIN_INTERVAL_MS = 30;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function isTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  // A device with > 1 touch points is almost certainly a phone/tablet with
  // a real vibration motor. Excludes desktops with a single touch point
  // (which are usually keyboard+mouse machines).
  return navigator.maxTouchPoints > 1 || 'ontouchstart' in window;
}

function userHasMuted(): boolean {
  try {
    return window.localStorage.getItem('wall.haptic.silent') === 'true';
  } catch {
    return false;
  }
}

function playAudioClick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Higher frequency + sharper envelope = a punchier, more present "tick"
    // instead of the previous muddy soft tone.
    osc.type = 'sine';
    osc.frequency.value = 2000;

    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.09, t + 0.001); // 1 ms sharp attack
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022); // 22 ms decay

    osc.start(t);
    osc.stop(t + 0.025);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {
    /* swallow audio errors — feedback is non-critical */
  }
}

/**
 * Initialize the AudioContext from within a user gesture (e.g. the
 * pointer-down that begins a drag). Browsers block AudioContext creation
 * + playback outside user gestures, so calling this here makes sure the
 * very first tick during the drag isn't silently dropped.
 */
export function prepareHaptic(): void {
  if (userHasMuted()) return;
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    try {
      ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Fire a single feedback tick. Safe to call from any user-gesture handler.
 * No-op if the previous tick was less than 30 ms ago, or if the user has
 * opted out via localStorage.
 */
export function tick(): void {
  const now =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastTickMs < MIN_INTERVAL_MS) return;
  lastTickMs = now;

  if (userHasMuted()) return;

  // Prefer vibration on touch devices that expose the Vibration API.
  // 18 ms gives a sharp, percussive "click" — short enough to read as
  // a tick, long enough that the user actually feels it. 8 ms (what we
  // had before) is below the threshold most phone vibration motors can
  // even reproduce, which is why the previous build felt like nothing.
  if (
    isTouchDevice() &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      const ok = navigator.vibrate(18);
      if (ok) return; // hardware accepted the call — done
    } catch {
      /* fall through to audio */
    }
  }

  // Fallback for: desktops without vibration hardware, iOS Safari (where
  // vibrate() exists but is a no-op), or any device where vibration was
  // rejected.
  playAudioClick();
}
