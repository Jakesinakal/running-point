// INTI aplikasi: menghasilkan beberapa pilihan rute jalan kaki A→B yang
// panjangnya MENDEKATI target.
//
// Ide: titik belok W yang membuat jarak |A→W| + |W→B| tetap akan membentuk elips
// dengan fokus A & B. Dengan menggeser W ke arah berbeda (kiri/kanan/bersudut dari
// garis A–B) lalu mencari jarak geser (offset) yang pas lewat binary-search, kita
// dapat beberapa rute yang sama-sama mendekati target tapi bentuknya beda.

import {
  bearing,
  destinationPoint,
  midpoint,
  haversine,
  crossTrackDistance,
} from './geo.js'
import { getDirections } from './api.js'

const DEFAULT_TOLERANCE = 0.06 // 6% dari target
const ITERATIONS = 6 // langkah binary-search per arah (≈ 1 call ORS / langkah)
const MAX_ROUTES = 3 // maksimal pilihan rute yang ditampilkan
const MIN_APEX_SEP = 600 // m — dua rute dianggap mirip bila puncak tikungannya berdekatan
const CANDIDATE_OFFSETS = [90, -90, 60, -60] // derajat relatif arah A→B (kanan/kiri)

// Minta rute; bila gagal karena jaringan (bukan karena rute tak ditemukan),
// ulang sekali. Mencegah blip jaringan sesaat dianggap "titik tak terjangkau".
async function directions(points) {
  try {
    return await getDirections(points)
  } catch (e) {
    if (e.kind === 'network') return await getDirections(points)
    throw e
  }
}

// "Puncak" sebuah rute: koordinat yang paling jauh (tegak lurus) dari garis a–b.
// Dipakai untuk menilai kemiripan dua rute (puncak berdekatan = bentuk mirip).
function routeApex(a, b, coords) {
  let apex = coords[0]
  let maxAbs = -1
  for (const p of coords) {
    const x = Math.abs(crossTrackDistance(a, b, p))
    if (x > maxAbs) {
      maxAbs = x
      apex = p
    }
  }
  return apex
}

// Binary-search satu arah tikungan. Mengembalikan kandidat rute terbaik untuk
// arah itu, atau null bila semua percobaan gagal (mis. titik tak terjangkau).
async function searchDirection(A, B, targetM, d0, bearingOffset, tolerance) {
  const perpBearing = bearing(A, B) + bearingOffset
  const mid = midpoint(A, B)
  let lo = 0
  let hi = (targetM - d0) * 2 + targetM * 0.1 // batas atas yang dijamin "kelewat panjang"
  let best = null

  for (let i = 0; i < ITERATIONS; i++) {
    const r = (lo + hi) / 2
    const W = destinationPoint(mid, perpBearing, r)

    let candidate
    try {
      candidate = await directions([A, W, B])
    } catch {
      hi = r // titik belok kemungkinan tak terjangkau → dekatkan ke garis
      continue
    }

    if (
      !best ||
      Math.abs(candidate.distance - targetM) < Math.abs(best.distance - targetM)
    ) {
      best = candidate
    }

    const err = candidate.distance - targetM
    if (Math.abs(err) <= tolerance * targetM) break
    if (err < 0) lo = r // kurang panjang → jauhkan titik belok
    else hi = r // kelewat panjang → dekatkan
  }

  if (!best) return null
  return {
    ...best,
    target: targetM,
    baselineDistance: d0,
    bearingOffset,
    withinTolerance: Math.abs(best.distance - targetM) <= tolerance * targetM,
    note: null,
    apex: routeApex(A, B, best.coordinates),
  }
}

// Hasilkan beberapa pilihan rute (hingga MAX_ROUTES) yang mendekati targetM (meter).
// `onProgress(current, total)`: callback opsional untuk indikator "mencari…".
//
// Hasil: { routes: [ {coordinates, distance, duration, target, baselineDistance,
//          bearingOffset, withinTolerance, note}, ... ], baselineDistance }
export async function planRoutes(A, B, targetM, options = {}) {
  const {
    onProgress,
    tolerance = DEFAULT_TOLERANCE,
    maxRoutes = MAX_ROUTES,
  } = options

  // Rute terpendek sebagai dasar (dihitung sekali, dipakai semua arah).
  const baseline = await directions([A, B])
  const d0 = baseline.distance

  const asResult = (note) => ({
    ...baseline,
    target: targetM,
    baselineDistance: d0,
    bearingOffset: 0,
    withinTolerance: Math.abs(d0 - targetM) <= tolerance * targetM,
    note,
  })

  // Target tak lebih panjang dari rute terpendek → cukup tampilkan rute terpendek.
  if (targetM <= d0 * (1 + tolerance)) {
    return {
      routes: [asResult(targetM < d0 ? 'target_lebih_pendek' : null)],
      baselineDistance: d0,
    }
  }

  // Coba tiap arah tikungan.
  const found = []
  for (let k = 0; k < CANDIDATE_OFFSETS.length; k++) {
    const cand = await searchDirection(
      A,
      B,
      targetM,
      d0,
      CANDIDATE_OFFSETS[k],
      tolerance,
    )
    if (cand) found.push(cand)
    onProgress?.(k + 1, CANDIDATE_OFFSETS.length)
  }

  // Tak ada yang berhasil dipanjangkan → fallback ke rute terpendek.
  if (found.length === 0) {
    return { routes: [asResult('gagal_memanjangkan')], baselineDistance: d0 }
  }

  // Urutkan dari yang paling dekat target, lalu buang yang bentuknya mirip.
  found.sort(
    (a, b) => Math.abs(a.distance - targetM) - Math.abs(b.distance - targetM),
  )
  const selected = []
  for (const cand of found) {
    if (selected.length >= maxRoutes) break
    const similar = selected.some(
      (s) => haversine(s.apex, cand.apex) < MIN_APEX_SEP,
    )
    if (!similar) selected.push(cand)
  }

  return { routes: selected, baselineDistance: d0 }
}
