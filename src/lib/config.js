// Konfigurasi Google Maps Platform & parameter perencana rute.

// Pusat & zoom peta awal (Jakarta) sebelum user memilih titik / memakai lokasinya.
export const DEFAULT_CENTER = { lat: -6.2, lng: 106.816666 }
export const DEFAULT_ZOOM = 13

// Map ID Google (wajib untuk Advanced Markers). 'DEMO_MAP_ID' untuk pengembangan;
// untuk produksi buat Map ID sendiri di Google Cloud Console → Map Management.
export const MAP_ID = 'DEMO_MAP_ID'

// Batasi hasil pencarian tempat ke satu negara (kode ISO huruf kecil; '' = bebas).
export const GEOCODE_COUNTRY = 'id'

// Ambil API key Google: utamakan dari .env (VITE_GMAPS_API_KEY), fallback localStorage.
export function getApiKey() {
  const fromEnv = import.meta.env.VITE_GMAPS_API_KEY
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  const fromStorage = localStorage.getItem('gmaps_api_key')
  return fromStorage ? fromStorage.trim() : ''
}
