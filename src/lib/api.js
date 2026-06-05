// Pembungkus layanan Google Maps JavaScript SDK.
// Catatan: API web Google tidak bisa dipanggil via REST dari browser (kena CORS),
// jadi rute dihitung lewat google.maps.DirectionsService dari SDK (sudah dimuat
// oleh APIProvider + library 'routes'). Pencarian tempat ditangani PlaceSearch.

// Minta rute jalan kaki yang melewati `points` ({lat,lng}) secara berurutan.
// Mengembalikan { coordinates: [{lat,lng}, ...], distance (meter), duration (detik) }.
export function getDirections(points) {
  const g = window.google
  if (!g?.maps?.DirectionsService)
    throw makeError('Layanan rute Google belum siap.', 'config')

  const pts = [...points]
  const origin = pts.shift()
  const destination = pts.pop()
  // Titik di antara = waypoint "lewat saja" (stopover:false), pas untuk titik belok.
  const waypoints = pts.map((p) => ({ location: p, stopover: false }))

  const service = new g.maps.DirectionsService()
  return new Promise((resolve, reject) => {
    service.route(
      { origin, destination, waypoints, travelMode: g.maps.TravelMode.WALKING },
      (res, status) => {
        if (status === 'OK' && res?.routes?.[0]) {
          const route = res.routes[0]
          const distance = route.legs.reduce((s, l) => s + l.distance.value, 0)
          const duration = route.legs.reduce(
            (s, l) => s + (l.duration?.value || 0),
            0,
          )
          const coordinates = route.overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }))
          resolve({ coordinates, distance, duration })
        } else if (status === 'ZERO_RESULTS') {
          reject(makeError('Rute jalan kaki tidak ditemukan ke titik itu.', 'routing'))
        } else if (status === 'OVER_QUERY_LIMIT') {
          reject(makeError('Terlalu banyak permintaan rute sekaligus. Coba lagi.', 'network'))
        } else {
          reject(makeError(`Gagal memuat rute Google (${status}).`, 'http'))
        }
      },
    )
  })
}

// Error dengan penanda `kind` agar pemanggil bisa membedakan blip yang boleh
// diulang (network) dari error rute/HTTP.
function makeError(message, kind) {
  const e = new Error(message)
  e.kind = kind
  return e
}
