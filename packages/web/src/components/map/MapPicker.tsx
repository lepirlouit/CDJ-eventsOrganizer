import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const BELGIUM: [number, number] = [50.5, 4.5];
const DETAIL_ZOOM = 15;

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;background:#E64626;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

function MapSync({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], DETAIL_ZOOM);
  }, [lat, lng, map]);
  return null;
}

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

interface Props {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}

export function MapPicker({ lat, lng, onChange }: Props) {
  const markerRef = useRef<L.Marker | null>(null);
  const position: [number, number] | null = lat && lng ? [lat, lng] : null;

  return (
    <Box>
      <Box sx={{ height: 240, borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
        <MapContainer
          center={position ?? BELGIUM}
          zoom={position ? DETAIL_ZOOM : 8}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapSync lat={lat} lng={lng} />
          <ClickCapture onPick={onChange} />
          {position && (
            <Marker
              position={position}
              icon={pinIcon}
              draggable
              ref={markerRef}
              eventHandlers={{
                dragend() {
                  const m = markerRef.current;
                  if (m) onChange(m.getLatLng().lat, m.getLatLng().lng);
                },
              }}
            />
          )}
        </MapContainer>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        {position
          ? `📍 ${lat!.toFixed(5)}, ${lng!.toFixed(5)} — drag the pin or click to reposition`
          : "Click on the map to place a pin"}
      </Typography>
    </Box>
  );
}
