// Device tier detection → adaptive quality knobs used by Game / Traffic / sim. (Measured FPS is NOT assumed.)
const ua = typeof navigator !== 'undefined' ? navigator : {}
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
export const MOBILE = coarse || /Android|iPhone|iPad|Mobile/i.test(ua.userAgent || '')
const weak = MOBILE && ((ua.deviceMemory && ua.deviceMemory <= 4) || (ua.hardwareConcurrency && ua.hardwareConcurrency <= 4))
export const Q = {
  mobile: MOBILE,
  weak,
  shadows: !MOBILE,            // desktop: soft shadows, phones: none (biggest single saving)
  dprMax: MOBILE ? (weak ? 1.0 : 1.25) : 2,
  drawDist: MOBILE ? 110 : 190, // vehicles / people beyond this are hidden
  npcCount: MOBILE ? (weak ? 14 : 20) : 34,
  vehPerLane: MOBILE ? (weak ? 1 : 2) : 3,
  levelDown() { Q.drawDist = Math.max(70, Q.drawDist - 20); Q.shadows = false },
}
