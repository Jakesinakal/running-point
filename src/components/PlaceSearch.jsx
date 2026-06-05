import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { GEOCODE_COUNTRY } from '../lib/config.js'
import { IconTarget, IconClose, IconPin } from './icons.jsx'

// Kolom pencarian tempat (gaya desain) memakai Google Places via JS SDK.
//   kind: 'a' | 'b' — warna titik penanda di kiri input
//   value / onChange — teks input dikontrol induk
//   onSelect(latlng, label) — saat satu saran dipilih
//   onClear — saat tombol silang ditekan
//   onPickOnMap — saat tombol "pilih di peta" ditekan (mengarmkan ketuk peta)
//   withLoc / onLoc — opsi "pakai lokasiku" (muncul di dropdown, hanya kolom awal)
export default function PlaceSearch({
  kind,
  value,
  onChange,
  onSelect,
  onClear,
  onPickOnMap,
  placeholder,
  focusPoint,
  withLoc,
  onLoc,
}) {
  const placesLib = useMapsLibrary('places')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const timerRef = useRef(null)
  const autocomplete = useRef(null)
  const details = useRef(null)

  useEffect(() => {
    if (!placesLib) return
    autocomplete.current = new placesLib.AutocompleteService()
    details.current = new placesLib.PlacesService(document.createElement('div'))
  }, [placesLib])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function handleChange(e) {
    const text = e.target.value
    onChange(text)
    clearTimeout(timerRef.current)
    if (text.trim().length < 2 || !autocomplete.current) {
      setResults([])
      return
    }
    timerRef.current = setTimeout(() => runSearch(text), 300)
  }

  function runSearch(text) {
    setLoading(true)
    setOpen(true)
    const request = {
      input: text,
      componentRestrictions: { country: GEOCODE_COUNTRY },
    }
    if (focusPoint && window.google) {
      request.location = new window.google.maps.LatLng(
        focusPoint.lat,
        focusPoint.lng,
      )
      request.radius = 30000
    }
    autocomplete.current.getPlacePredictions(request, (preds, status) => {
      setLoading(false)
      setResults(
        status === 'OK' && preds
          ? preds.map((p) => ({
              placeId: p.place_id,
              main: p.structured_formatting?.main_text || p.description,
              secondary: p.structured_formatting?.secondary_text || '',
            }))
          : [],
      )
    })
  }

  function pick(item) {
    setOpen(false)
    setResults([])
    details.current.getDetails(
      { placeId: item.placeId, fields: ['geometry', 'name', 'formatted_address'] },
      (place, status) => {
        if (status === 'OK' && place?.geometry?.location) {
          const loc = place.geometry.location
          onSelect({ lat: loc.lat(), lng: loc.lng() }, item.main)
        }
      },
    )
  }

  const showDropdown = open && (withLoc || loading || results.length > 0)

  return (
    <div className="search-field-shell" ref={boxRef}>
      <div className="search-field">
        <span className={`leadpin ${kind}`} />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
        />
        {value ? (
          <button
            className="clear-btn"
            aria-label="Hapus"
            onMouseDown={(e) => {
              e.preventDefault()
              onClear()
              setResults([])
              setOpen(false)
            }}
          >
            <IconClose size={15} />
          </button>
        ) : (
          <button
            className="loc-btn"
            title="Pilih di peta"
            aria-label="Pilih di peta"
            onMouseDown={(e) => {
              e.preventDefault()
              setOpen(false)
              onPickOnMap()
            }}
          >
            <IconPin size={17} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="suggestions">
          {withLoc && (
            <div
              className="suggestion-item"
              onMouseDown={(e) => {
                e.preventDefault()
                onLoc()
                setOpen(false)
              }}
            >
              <div className="sicon" style={{ color: 'var(--accent-strong)' }}>
                <IconTarget size={16} />
              </div>
              <div className="stext">
                <b>Pakai lokasiku</b>
                <small>Deteksi posisi saat ini</small>
              </div>
            </div>
          )}
          {results.map((r) => (
            <div
              key={r.placeId}
              className="suggestion-item"
              onMouseDown={() => pick(r)}
            >
              <div className="sicon">
                <IconPin size={16} />
              </div>
              <div className="stext">
                <b>{r.main}</b>
                <small>{r.secondary}</small>
              </div>
            </div>
          ))}
          {loading && results.length === 0 && (
            <div className="suggestion-item">
              <div className="sicon">
                <IconPin size={16} />
              </div>
              <div className="stext">
                <small>Mencari…</small>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
