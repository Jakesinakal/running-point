// INTI aplikasi: menghasilkan beberapa pilihan rute jalan kaki A→B yang
// panjangnya MENDEKATI target.
//
// Ide: titik belok W yang membuat jarak |A→W| + |W→B| tetap akan membentuk elips
// dengan fokus A & B. Dengan menggeser W ke arah berbeda (kiri/kanan/bersudut dari
// garis A–B) lalu mencari jarak geser (offset) yang pas lewat binary-search, kita
// dapat beberapa rute yang sama-sama mendekati target tapi bentuknya beda.
//
// Bila ada titik singgah wajib (via), segmen terpanjang (A→via atau via→B)
// yang dipanjangkan; via tetap dilewati.

import {
  bearing,
  destinationPoint,
  midpoint,
  haversine,
  crossTrackDistance,
} from './geo.js'
import { getDirections } from './api.js'

const DEFAULT_TOLERANCE = 0.06
const ITERATIONS = 6
const MAX_ROUTES = 3
const MIN_APEX_SEP = 600
const CANDIDATE_OFFSETS = [90, -90, 60, -60]

async function directions(points) {
  try {
    return await getDirections(points)
  } catch (e) {
    if (e.kind === 'network') return await getDirections(points)
    throw e
  }
}

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

// buildPoints(W): kembalikan array titik ke directions().
// Default: [A, W, B]. Untuk via: [A, W, via, B] atau [A, via, W, B].
async function searchDirection(A, B, targetM, d0, bearingOffset, tolerance, buildPoints) {
  const perpBearing = bearing(A, B) + bearingOffset
  const mid = midpoint(A, B)
  const getPoints = buildPoints ?? ((W) => [A, W, B])
  let lo = 0
  let hi = (targetM - d0) * 2 + targetM * 0.1
  let best = null

  for (let i = 0; i < ITERATIONS; i++) {
    const r = (lo + hi) / 2
    const W = destinationPoint(mid, perpBearing, r)

    let candidate
    try {
      candidate = await directions(getPoints(W))
    } catch {
      hi = r
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
    if (err < 0) lo = r
    else hi = r
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

// Rute dengan titik singgah wajib. Segmen terpanjang (A→via atau via→B)
// dipanjangkan via binary-search; via tetap dilewati.
async function planRoutesVia(A, via, B, targetM, { onProgress, tolerance, maxRoutes }) {
  const baseline = await directions([A, via, B])
  const d0 = baseline.distance

  const asResult = (note) => ({
    ...baseline,
    target: targetM,
    baselineDistance: d0,
    bearingOffset: 0,
    withinTolerance: Math.abs(d0 - targetM) <= tolerance * targetM,
    note,
    apex: routeApex(A, B, baseline.coordinates),
  })

  if (d0 >= targetM * (1 - tolerance)) {
    return {
      routes: [asResult(d0 > targetM * (1 + tolerance) ? 'via_terlalu_panjang' : null)],
      baselineDistance: d0,
    }
  }

  const [legAC, legCB] = await Promise.all([
    directions([A, via]),
    directions([via, B]),
  ])
  const extendAC = legAC.distance >= legCB.distance
  const segA = extendAC ? A : via
  const segB = extendAC ? via : B
  const buildPoints = extendAC ? (W) => [A, W, via, B] : (W) => [A, via, W, B]

  const found = []
  for (let k = 0; k < CANDIDATE_OFFSETS.length; k++) {
    const cand = await searchDirection(
      segA, segB, targetM, d0, CANDIDATE_OFFSETS[k], tolerance, buildPoints,
    )
    if (cand) found.push(cand)
    onProgress?.(k + 1, CANDIDATE_OFFSETS.length)
  }

  if (found.length === 0) {
    return { routes: [asResult('gagal_memanjangkan')], baselineDistance: d0 }
  }

  found.sort((a, b) => Math.abs(a.distance - targetM) - Math.abs(b.distance - targetM))
  const selected = []
  for (const cand of found) {
    if (selected.length >= maxRoutes) break
    const similar = selected.some((s) => haversine(s.apex, cand.apex) < MIN_APEX_SEP)
    if (!similar) selected.push(cand)
  }

  return { routes: selected, baselineDistance: d0 }
}

export async function planRoutes(A, B, targetM, options = {}) {
  const {
    onProgress,
    tolerance = DEFAULT_TOLERANCE,
    maxRoutes = MAX_ROUTES,
    via,
  } = options

  if (via) {
    return planRoutesVia(A, via, B, targetM, { onProgress, tolerance, maxRoutes })
  }

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

  if (targetM <= d0 * (1 + tolerance)) {
    return {
      routes: [asResult(targetM < d0 ? 'target_lebih_pendek' : null)],
      baselineDistance: d0,
    }
  }

  const found = []
  for (let k = 0; k < CANDIDATE_OFFSETS.length; k++) {
    const cand = await searchDirection(
      A, B, targetM, d0, CANDIDATE_OFFSETS[k], tolerance,
    )
    if (cand) found.push(cand)
    onProgress?.(k + 1, CANDIDATE_OFFSETS.length)
  }

  if (found.length === 0) {
    return { routes: [asResult('gagal_memanjangkan')], baselineDistance: d0 }
  }

  found.sort((a, b) => Math.abs(a.distance - targetM) - Math.abs(b.distance - targetM))
  const selected = []
  for (const cand of found) {
    if (selected.length >= maxRoutes) break
    const similar = selected.some((s) => haversine(s.apex, cand.apex) < MIN_APEX_SEP)
    if (!similar) selected.push(cand)
  }

  return { routes: selected, baselineDistance: d0 }
}
