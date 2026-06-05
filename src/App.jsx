import { useEffect, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import MapView from './components/MapView.jsx'
import PlaceSearch from './components/PlaceSearch.jsx'
import { planRoutes } from './lib/routePlanner.js'
import { getApiKey, DEFAULT_CENTER } from './lib/config.js'
import {
  IconRunner,
  IconMoon,
  IconSun,
  IconRoute,
  IconSliders,
  IconCheck,
  IconClock,
  IconClose,
} from './components/icons.jsx'

const fmtKm = (m) => (m / 1000).toFixed(1)
const fmtMin = (s) => Math.round(s / 60) + ' mnt'
const MAP_PICK_LABEL = 'Titik di peta'
const LAST_LOC_KEY = 'rp-last-loc'

function initialTheme() {
  try {
    const saved = localStorage.getItem('rp-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function readCachedLocation() {
  try {
    const p = JSON.parse(localStorage.getItem(LAST_LOC_KEY))
    if (typeof p?.lat === 'number' && typeof p?.lng === 'number') return p
  } catch {
    /* abaikan */
  }
  return null
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme)
  const [start, setStart] = useState(null)
  const [dest, setDest] = useState(null)
  const [via, setVia] = useState(null)
  const [startText, setStartText] = useState('')
  const [destText, setDestText] = useState('')
  const [viaText, setViaText] = useState('')
  const [viaVisible, setViaVisible] = useState(false)
  const [targetKm, setTargetKm] = useState(10)
  const [routes, setRoutes] = useState(null)
  const [baselineDistance, setBaselineDistance] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recenterTo, setRecenterTo] = useState(null)
  const [myLocation, setMyLocation] = useState(null)
  const [pickMode, setPickMode] = useState(null) // null | 'start' | 'via' | 'dest'
  const [searchOpen, setSearchOpen] = useState(false)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  const [initialCenter] = useState(() => readCachedLocation() || DEFAULT_CENTER)

  const routesLib = useMapsLibrary('routes')
  const ready = Boolean(routesLib)
  const hasKey = Boolean(getApiKey())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('rp-theme', theme)
    } catch {
      /* abaikan */
    }
  }, [theme])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMyLocation(p)
        setRecenterTo(p)
        try {
          localStorage.setItem(LAST_LOC_KEY, JSON.stringify(p))
        } catch {
          /* abaikan */
        }
      },
      () => { /* izin ditolak */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  }, [])

  function handleMapClick(latlng) {
    if (!pickMode) return
    if (pickMode === 'start') { setStart(latlng); setStartText(MAP_PICK_LABEL) }
    else if (pickMode === 'via') { setVia(latlng); setViaText(MAP_PICK_LABEL) }
    else { setDest(latlng); setDestText(MAP_PICK_LABEL) }
    setPickMode(null)
    setError('')
  }

  function handleMarkerDrag(which, latlng) {
    if (which === 'start') { setStart(latlng); setStartText(MAP_PICK_LABEL) }
    else if (which === 'via') { setVia(latlng); setViaText(MAP_PICK_LABEL) }
    else { setDest(latlng); setDestText(MAP_PICK_LABEL) }
  }

  function activatePickMode(mode) {
    setSearchOpen(false)
    setPickMode(mode)
    setError('')
  }

  function pickStart(latlng, label) {
    setStart(latlng); setStartText(label); setRecenterTo(latlng); setPickMode(null); setError('')
    if (dest) setSearchOpen(false)
  }
  function pickDest(latlng, label) {
    setDest(latlng); setDestText(label); setRecenterTo(latlng); setPickMode(null); setError('')
    if (start) setSearchOpen(false)
  }
  function pickVia(latlng, label) {
    setVia(latlng); setViaText(label); setRecenterTo(latlng); setPickMode(null); setError('')
  }

  function clearStart() { setStart(null); setStartText('') }
  function clearDest() { setDest(null); setDestText('') }
  function clearVia() { setVia(null); setViaText('') }
  function removeVia() { setVia(null); setViaText(''); setViaVisible(false) }

  function useMyLocation() {
    if (locating) return
    if (!navigator.geolocation) {
      setError('Browser tidak mendukung deteksi lokasi.')
      return
    }
    setPickMode(null)
    setLocating(true)
    setError('')
    setStartText('Mencari lokasi…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setStart(p); setStartText('Lokasi saya'); setMyLocation(p)
        setRecenterTo(p); setLocating(false)
        if (dest) setSearchOpen(false)
      },
      (err) => {
        setStartText('')
        setError(
          err.code === 1
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser.'
            : 'Lokasi tidak tersedia saat ini.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function reset() {
    setStart(null); setDest(null); setVia(null)
    setStartText(''); setDestText(''); setViaText('')
    setViaVisible(false)
    setRoutes(null); setBaselineDistance(null); setSelectedIndex(0)
    setPickMode(null); setError('')
  }

  async function handleSearch() {
    if (!start || !dest) {
      setError('Tentukan titik awal (A) dan tujuan (B) dulu.')
      return
    }
    setLoading(true); setError(''); setRoutes(null); setBaselineDistance(null); setProgress(null)
    try {
      const res = await planRoutes(start, dest, targetKm * 1000, {
        onProgress: (current, total) => setProgress({ current, total }),
        via: via || undefined,
      })
      setRoutes(res.routes); setBaselineDistance(res.baselineDistance); setSelectedIndex(0)
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan.')
    } finally {
      setLoading(false); setProgress(null)
    }
  }

  const canSearch = start && dest && ready && !loading
  const firstRoute = routes?.[0]
  const showShortMsg = firstRoute?.note === 'target_lebih_pendek'
  const viaOverTarget = routes?.length === 1 && firstRoute?.note === 'via_terlalu_panjang'
  const failedExtend = routes?.length === 1 && firstRoute?.note === 'gagal_memanjangkan'

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <IconRunner size={22} />
          </div>
          <div>
            <div className="brand-title">Running Point</div>
            <div className="brand-tagline">Rute lari sesuai target jarakmu</div>
          </div>
        </div>
        <button
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          title={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
          aria-label="Ganti tema"
        >
          {theme === 'light' ? <IconMoon size={19} /> : <IconSun size={19} />}
        </button>
      </header>

      <div className="map-wrap">
        <MapView
          theme={theme}
          picking={Boolean(pickMode)}
          initialCenter={initialCenter}
          myLocation={myLocation}
          start={start}
          via={via}
          dest={dest}
          routes={routes}
          selectedIndex={selectedIndex}
          recenter={recenterTo}
          onMapClick={handleMapClick}
          onMarkerDrag={handleMarkerDrag}
        />

        {/* Collapsed search bar — ketuk untuk buka/tutup dropdown */}
        <div
          className={`collapsed-bar${loading ? ' loading' : ''}`}
          onClick={() => !loading && setSearchOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !loading && setSearchOpen((o) => !o)}
        >
          {loading ? (
            <>
              <span className="spinner" />
              <span>Mencari rute… ({progress?.current ?? 0}/{progress?.total ?? 4})</span>
            </>
          ) : start || dest ? (
            <div className="cb-route">
              <span className="cb-dot a" />
              <span className="cb-label">{startText || '—'}</span>
              <span className="cb-sep">→</span>
              {via && viaVisible && (
                <>
                  <span className="cb-dot c" />
                  <span className="cb-label">{viaText}</span>
                  <span className="cb-sep">→</span>
                </>
              )}
              <span className="cb-dot b" />
              <span className="cb-label">{destText || '—'}</span>
            </div>
          ) : (
            <span className="cb-placeholder">Mau lari kemana kamu?</span>
          )}
        </div>

        {/* Progress bar tipis saat loading */}
        {loading && progress && (
          <div className="map-progress-track">
            <div
              className="map-progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        )}

        {/* Dropdown pencarian — keluar dari atas, tidak nutup seluruh layar */}
        {searchOpen && (
          <>
            <div className="search-overlay" onClick={() => setSearchOpen(false)} />
            <div className="search-dropdown">
              <PlaceSearch
                kind="a"
                placeholder="Cari titik awal…"
                focusPoint={start || dest || myLocation}
                value={startText}
                onChange={setStartText}
                onSelect={pickStart}
                onClear={clearStart}
                onPickOnMap={() => activatePickMode('start')}
                withLoc
                onLoc={useMyLocation}
              />

              {viaVisible ? (
                <div className="via-row">
                  <div className="via-field">
                    <PlaceSearch
                      kind="c"
                      placeholder="Cari titik singgah…"
                      focusPoint={via || start || dest || myLocation}
                      value={viaText}
                      onChange={setViaText}
                      onSelect={pickVia}
                      onClear={clearVia}
                      onPickOnMap={() => activatePickMode('via')}
                    />
                  </div>
                  <button
                    className="remove-via"
                    onClick={removeVia}
                    aria-label="Hapus titik singgah"
                  >
                    <IconClose size={13} />
                  </button>
                </div>
              ) : (
                <button className="add-via-btn" onClick={() => setViaVisible(true)}>
                  <span className="add-via-icon">+</span>
                  <span>Lewat sini</span>
                </button>
              )}

              <PlaceSearch
                kind="b"
                placeholder="Cari tujuan…"
                focusPoint={dest || start || myLocation}
                value={destText}
                onChange={setDestText}
                onSelect={pickDest}
                onClear={clearDest}
                onPickOnMap={() => activatePickMode('dest')}
              />
            </div>
          </>
        )}

        {/* Banner mode ketuk peta */}
        {pickMode && (
          <div className="pick-banner">
            <span>
              Ketuk peta untuk{' '}
              {pickMode === 'start'
                ? 'titik awal'
                : pickMode === 'via'
                  ? 'titik singgah'
                  : 'tujuan'}
            </span>
            <button className="pb-cancel" onClick={() => setPickMode(null)}>
              Batal
            </button>
          </div>
        )}
      </div>

      {/* Bottom sheet — selalu di bawah peta */}
      <div className="sheet">
        <div className="sheet-handle" />

        {!hasKey && (
          <p className="warn">
            ⚠️ API key Google Maps belum terbaca. Isi <code>VITE_GMAPS_API_KEY</code>{' '}
            di <code>.env</code>, lalu jalankan ulang <code>npm run dev</code>.
          </p>
        )}

        <div className="target-block">
          <div className="target-top">
            <div className="tl">
              <IconSliders size={17} />
              <span>Target jarak</span>
            </div>
            <div className="target-num">
              {targetKm}
              <small>km</small>
            </div>
          </div>
          <input
            className="slider"
            type="range"
            min="1"
            max="42"
            step="1"
            value={targetKm}
            onChange={(e) => setTargetKm(+e.target.value)}
          />
          <div className="slider-scale">
            <span>1 km</span>
            <span>21 km</span>
            <span>42 km</span>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" disabled={!canSearch} onClick={handleSearch}>
            {!ready ? (
              'Menyiapkan peta…'
            ) : loading ? (
              <>
                <span className="spinner" />
                Mencari rute… ({progress ? progress.current : 0}/
                {progress ? progress.total : 4})
              </>
            ) : (
              <>
                <IconRoute size={19} />
                Cari Rute
              </>
            )}
          </button>
          <button className="btn btn-secondary" onClick={reset} disabled={loading}>
            Reset
          </button>
        </div>

        {loading && progress && (
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {routes && !loading && (
          <div className="fade-in" style={{ marginTop: 16 }}>
            {showShortMsg ? (
              <div className="summary-line">
                <span>
                  Tujuanmu sudah <b>{fmtKm(firstRoute.distance)} km</b> — lebih jauh
                  dari target {targetKm} km
                </span>
              </div>
            ) : viaOverTarget ? (
              <div className="summary-line">
                <span>
                  Rute lewat titik singgah sudah{' '}
                  <b>{fmtKm(firstRoute.distance)} km</b> — melebihi target {targetKm} km
                </span>
              </div>
            ) : (
              <>
                <div className="routes">
                  {routes.map((r, i) => (
                    <div
                      key={i}
                      className={`route-card ${i === selectedIndex ? 'active' : ''}`}
                      onClick={() => setSelectedIndex(i)}
                    >
                      <div className="route-rank">{i + 1}</div>
                      <div className="route-main">
                        <div className="rtop">
                          <span className="rkm">{fmtKm(r.distance)} km</span>
                          <span
                            className={`badge ${r.withinTolerance ? 'badge-ok' : 'badge-near'}`}
                          >
                            {r.withinTolerance ? (
                              <><IconCheck size={11} />≈ target</>
                            ) : (
                              'mendekati'
                            )}
                          </span>
                        </div>
                        <div className="route-meta">
                          <span>
                            <IconClock size={12} />
                            {fmtMin(r.duration)}
                          </span>
                        </div>
                      </div>
                      <div className="route-check">
                        <IconCheck size={13} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="summary-line">
                  <span>
                    Target <b>{targetKm} km</b>
                  </span>
                  <span className="sep">·</span>
                  <span>
                    terpendek <b>{fmtKm(baselineDistance)} km</b>
                  </span>
                  {failedExtend && (
                    <>
                      <span className="sep">·</span>
                      <span>area sulit dipanjangkan</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
