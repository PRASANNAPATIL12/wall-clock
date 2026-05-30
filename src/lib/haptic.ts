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
/** Minimum gap between consecutive ticks. Below this, the motor or audio
 *  envelope can't reproduce the pulse cleanly anyway. 18 ms lets ~55 ticks/s
 *  through — fast enough that even rapid drags hit every minute mark. */
const MIN_INTERVAL_MS = 18;

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
 * + playback outside user gestures, so calling this here makes sure
 * subsequent automatic events (drag ticks, goal-reached chimes that fire
 * when the minute hand reaches the target without further user input)
 * still produce sound.
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
 * Goal-achievement chime. Fired once when the minute hand reaches the
 * target (state.kind === 'targeted' && elapsedMs ≥ targetMs).
 *
 * Layered tone — open A-major chord (A5 + E6 + A6) with staggered
 * exponential decays so the high harmonics fade first, the fundamental
 * rings longest. Designed to sound like a soft bell chime, not a video-
 * game victory ding. Total ~900 ms.
 *
 * Vibration: a two-pulse [40, 30, 80] pattern — short pulse, brief pause,
 * longer pulse. "ta-DA" feel that physically marks the moment.
 *
 * Unlike `tick()`, this fires BOTH channels together (audio AND vibration
 * if available). The completion moment is significant enough that
 * multimodal feedback is appropriate.
 */
export function celebrate(): void {
  if (userHasMuted()) return;

  // Vibration — always attempt (no-op on devices without hardware).
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate([40, 30, 80]);
    } catch {
      /* ignore */
    }
  }

  playChime();
}

function playChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    // Open A-major chord, soft-bell envelope (no attack click — gentle).
    const notes: Array<{ freq: number; gain: number; decay: number }> = [
      { freq: 880, gain: 0.08, decay: 0.9 }, // A5  fundamental, longest ring
      { freq: 1318.51, gain: 0.05, decay: 0.6 }, // E6  fifth, mid-length harmonic
      { freq: 1760, gain: 0.03, decay: 0.35 }, // A6  upper octave, quick sparkle
    ];
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(note.gain, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.decay);
      osc.start(t);
      osc.stop(t + note.decay + 0.05);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  } catch {
    /* swallow audio errors — feedback is non-critical */
  }
}

/**
 * Fire a single feedback tick. Safe to call from any user-gesture handler.
 * No-op if the previous tick was less than MIN_INTERVAL_MS ago, or if the
 * user has opted out via localStorage.
 *
 * Both channels fire in PARALLEL (no fallback semantics):
 *
 *   · navigator.vibrate(28 ms) — produces a real haptic tap on Android
 *     phones; harmless no-op on iOS Safari and most desktops where the
 *     hardware doesn't respond. 28 ms is past the typical 5-10 ms motor
 *     spin-up time, so the user actually feels each tick. (Our previous
 *     18 ms was being cut off mid-spin-up by some motors.)
 *
 *   · playAudioClick() — a brief, sharp 2 kHz sine click. Plays on every
 *     device that hasn't been muted, so iOS users (with no working
 *     vibration) still get sub-cortical feedback, and Android users get
 *     audio + vibration together for extra presence.
 *
 * The previous "vibrate, return early on success" pattern was unreliable
 * because navigator.vibrate() returns `true` whether the motor actually
 * engaged or not. On any device where it silently no-ops (HTTP context,
 * device on silent, weak motor) the user got no feedback at all. Firing
 * both channels eliminates that single-point failure.
 *
 * Users who find the audio too present can set
 * localStorage.setItem('wall.haptic.silent', 'true') to mute both.
 */
export function tick(): void {
  const now =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastTickMs < MIN_INTERVAL_MS) return;
  lastTickMs = now;

  if (userHasMuted()) return;

  // Vibration — always attempt. No-op on devices without hardware.
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(28);
    } catch {
      /* ignore */
    }
  }

  // Audio — always play (alongside vibration if it fired).
  playAudioClick();
}
