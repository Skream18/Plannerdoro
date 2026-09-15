let ctx = null

function getContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioCtor) return null
  if (!ctx) ctx = new AudioCtor()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** Unlocks the AudioContext — call from a user gesture (e.g. pressing Start) so the later chime isn't blocked. */
export function primeAudio() {
  getContext()
}

/** A minimal two-tone chime for session-complete notifications. */
export function playChime() {
  const audioCtx = getContext()
  if (!audioCtx) return
  const now = audioCtx.currentTime
  const notes = [659.25, 880]
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = now + i * 0.16
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.16, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(start)
    osc.stop(start + 0.44)
  })
}
