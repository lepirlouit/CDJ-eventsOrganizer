import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { dojoIcon, dojoIconSelected } from "./markerIcon";
import Box from "@mui/material/Box";

interface Dojo {
  dojoId: string;
  name: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

interface Props {
  dojos: Dojo[];
  selectedDojoId: string | null;
  onMarkerClick: (dojoId: string) => void;
}

function FlyToSelected({ dojos, selectedDojoId }: { dojos: Dojo[]; selectedDojoId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedDojoId) return;
    const dojo = dojos.find((d) => d.dojoId === selectedDojoId);
    if (dojo?.latitude && dojo.longitude) {
      map.flyTo([dojo.latitude, dojo.longitude], 13, { animate: true, duration: 0.8 });
    }
  }, [selectedDojoId, dojos, map]);
  return null;
}

export function DojoMap({ dojos, selectedDojoId, onMarkerClick }: Props) {
  const { t } = useTranslation();
  const mappable = dojos.filter((d) => d.latitude && d.longitude);

  return (
    <Box sx={{ height: "100%", minHeight: 400, borderRadius: 2, overflow: "hidden" }}>
      <MapContainer
        center={[50.5, 4.4]}
        zoom={8}
        style={{ height: "100%", minHeight: 400 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToSelected dojos={dojos} selectedDojoId={selectedDojoId} />
        {mappable.map((dojo) => (
          <Marker
            key={dojo.dojoId}
            position={[dojo.latitude!, dojo.longitude!]}
            icon={dojo.dojoId === selectedDojoId ? dojoIconSelected : dojoIcon}
            eventHandlers={{ click: () => onMarkerClick(dojo.dojoId) }}
          >
            <Popup>
              <strong>{dojo.name}</strong>
              <br />
              {dojo.city}
              <br />
              <Link to={`/dojos/${dojo.dojoId}/events`}>{t("home.see_events")}</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
}
