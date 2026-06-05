import { useEffect } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_ID } from '../lib/config.js'

// Warna polyline (Google butuh nilai konkret, bukan CSS var).
const ROUTE = {
  light: { accent: '#10b981', faint: '#aab6c8' },
  dark: { accent: '#2ee6a6', faint: '#3b4861' },
}

// Polyline imperatif (vis.gl tidak menyediakan komponen Polyline bawaan).
function RoutePolyline({ path, options }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !window.google) return
    const line = new window.google.maps.Polyline({ path, ...options, map })
    return () => line.setMap(null)
  }, [map, path, options])
  return null
}

// Pas-kan tampilan peta ke seluruh rute saat hasil pencarian berubah.
function FitBounds({ routes }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !window.google || !routes?.length) return
    const bounds = new window.google.maps.LatLngBounds()
    routes.forEach((r) => r.coordinates.forEach((p) => bounds.extend(p)))
    map.fitBounds(bounds, 60)
  }, [map, routes])
  return null
}

// Geser peta ke titik yang dipilih (lokasi sekarang / pencarian / "pakai lokasiku").
function RecenterOn({ point }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !point) return
    map.panTo(point)
    if ((map.getZoom() ?? DEFAULT_ZOOM) < 15) map.setZoom(15)
  }, [map, point])
  return null
}

// Ambil {lat,lng} dari event Google (latLng bisa objek LatLng atau literal).
function latLngFromEvent(e) {
  const ll = e?.latLng ?? e?.detail?.latLng
  if (!ll) return null
  return {
    lat: typeof ll.lat === 'function' ? ll.lat() : ll.lat,
    lng: typeof ll.lng === 'function' ? ll.lng() : ll.lng,
  }
}

export default function MapView({
  theme,
  picking,
  initialCenter,
  myLocation,
  start,
  via,
  dest,
  routes,
  selectedIndex,
  recenter,
  onMapClick,
  onMarkerDrag,
}) {
  const c = ROUTE[theme] || ROUTE.light
  // Gambar rute yang TIDAK terpilih dulu, lalu yang terpilih (agar di atas).
  const ordered = routes
    ? routes
        .map((r, i) => ({ r, i }))
        .sort(
          (a, b) =>
            (a.i === selectedIndex ? 1 : 0) - (b.i === selectedIndex ? 1 : 0),
        )
    : []

  return (
    <Map
      key={theme}
      className="gmap"
      defaultCenter={initialCenter || DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      mapId={MAP_ID}
      colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      draggableCursor={picking ? 'crosshair' : undefined}
      onClick={(e) => {
        const ll = latLngFromEvent(e)
        if (ll) onMapClick(ll)
      }}
    >
      <FitBounds routes={routes} />
      <RecenterOn point={recenter} />

      {myLocation && (
        <AdvancedMarker position={myLocation} clickable={false} zIndex={4}>
          <div className="me-dot" />
        </AdvancedMarker>
      )}

      {ordered.map(({ r, i }) => (
        <RoutePolyline
          key={i}
          path={r.coordinates}
          options={
            i === selectedIndex
              ? { strokeColor: c.accent, strokeWeight: 6, strokeOpacity: 1, zIndex: 10 }
              : { strokeColor: c.faint, strokeWeight: 4, strokeOpacity: 0.6, zIndex: 1 }
          }
        />
      ))}

      {via && (
        <AdvancedMarker
          position={via}
          draggable
          zIndex={20}
          onDragEnd={(e) => {
            const ll = latLngFromEvent(e)
            if (ll) onMarkerDrag('via', ll)
          }}
        >
          <div className="map-pin c">
            <div className="head">
              <span>C</span>
            </div>
          </div>
        </AdvancedMarker>
      )}
      {start && (
        <AdvancedMarker
          position={start}
          draggable
          zIndex={20}
          onDragEnd={(e) => {
            const ll = latLngFromEvent(e)
            if (ll) onMarkerDrag('start', ll)
          }}
        >
          <div className="map-pin a">
            <div className="head">
              <span>A</span>
            </div>
          </div>
        </AdvancedMarker>
      )}
      {dest && (
        <AdvancedMarker
          position={dest}
          draggable
          zIndex={20}
          onDragEnd={(e) => {
            const ll = latLngFromEvent(e)
            if (ll) onMarkerDrag('dest', ll)
          }}
        >
          <div className="map-pin b">
            <div className="head">
              <span>B</span>
            </div>
          </div>
        </AdvancedMarker>
      )}
    </Map>
  )
}
