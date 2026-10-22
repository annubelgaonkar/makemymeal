"use client";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru

const pinIcon = L.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 34] });

function ClickToMove({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], 18, { duration: 0.8 }); }, [target, map]);
  return null;
}

export default function MapPicker({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState("");
  const [flyTarget, setFlyTarget] = useState(null);
  const center = useMemo(() => (value ? [value.lat, value.lng] : DEFAULT_CENTER), []); // eslint-disable-line react-hooks/exhaustive-deps

  function useMyLocation() {
    if (!navigator.geolocation) { setMsg("This browser can't share your location. Tap the map instead."); return; }
    setLocating(true); setMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(p); setFlyTarget(p); setLocating(false);
        setMsg(pos.coords.accuracy > 50 ? `Accurate to about ${Math.round(pos.coords.accuracy)} m. Drag the pin onto your door.` : "Pin placed. Drag it if it's not exactly on your door.");
      },
      (err) => { setLocating(false); setMsg(err.code === 1 ? "Location permission was blocked. Allow it in your browser, or tap the map to drop the pin." : "Couldn't get your location. Tap the map to drop the pin."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div className="map-box">
      <MapContainer center={center} zoom={value ? 18 : 12} className="map" scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <ClickToMove onPick={onChange} />
        <FlyTo target={flyTarget} />
        {value && (
          <Marker position={[value.lat, value.lng]} icon={pinIcon} draggable
            eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onChange({ lat: ll.lat, lng: ll.lng }); } }} />
        )}
      </MapContainer>
      <div className="map-bar">
        <span className="coords">{value ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Tap the map to drop your pin"}</span>
        <span style={{ display: "flex", gap: 6 }}>
          {value && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>Clear</button>}
          <button type="button" className="btn btn-yellow btn-sm" onClick={useMyLocation} disabled={locating}>{locating ? "Locating…" : "Use my current location"}</button>
        </span>
      </div>
      {msg && <div className="map-msg">{msg}</div>}
    </div>
  );
}
