// Helper geometri murni (tanpa dependency). Titik = { lat, lng } dalam derajat.
// Dipakai oleh routePlanner (M2) untuk membangkitkan titik belok kandidat.

const R = 6371000 // radius bumi (meter)
const toRad = (d) => (d * Math.PI) / 180
const toDeg = (r) => (r * 180) / Math.PI

// Jarak garis-lurus (great-circle) antara dua titik, dalam meter.
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Arah (bearing) dari titik a ke b, dalam derajat 0–360 (0 = utara).
export function bearing(a, b) {
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// Titik tujuan dari `origin`, bergerak `distM` meter ke arah `bearingDeg` derajat.
export function destinationPoint(origin, bearingDeg, distM) {
  const d = distM / R
  const brng = toRad(bearingDeg)
  const lat1 = toRad(origin.lat)
  const lng1 = toRad(origin.lng)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lat: toDeg(lat2), lng: toDeg(lng2) }
}

// Titik tengah geografis dari dua titik.
export function midpoint(a, b) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}

// Jarak tegak lurus (signed) titik `p` dari garis besar a→b, dalam meter.
// Tandanya menunjukkan sisi kiri/kanan garis. Dipakai untuk mencari "puncak"
// tikungan sebuah rute & menilai apakah dua rute bentuknya mirip.
export function crossTrackDistance(a, b, p) {
  const d13 = haversine(a, p) / R
  const t13 = toRad(bearing(a, p))
  const t12 = toRad(bearing(a, b))
  return Math.asin(Math.sin(d13) * Math.sin(t13 - t12)) * R
}
