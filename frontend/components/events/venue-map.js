"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import "leaflet/dist/leaflet.css";
// Custom marker icon
const customIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
export function VenueMap({ latitude, longitude, venueName, venueAddress }) {
  const [isMounted, setIsMounted] = useState(false);

  // Prevent SSR issues with Leaflet
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(url, "_blank");
  };
  const getDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, "_blank");
  };
  if (!isMounted) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "w-full h-[300px] bg-gray-100 rounded-xl flex items-center justify-center",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center text-gray-500",
        },
        /*#__PURE__*/ React.createElement(MapPin, {
          className: "w-8 h-8 mx-auto mb-2 opacity-50",
        }),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-sm",
          },
          "Loading map...",
        ),
      ),
    );
  }
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "space-y-4",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "relative w-full h-[300px] rounded-xl overflow-hidden border border-gray-200",
      },
      /*#__PURE__*/ React.createElement(
        MapContainer,
        {
          center: [latitude, longitude],
          zoom: 15,
          scrollWheelZoom: false,
          className: "w-full h-full z-0",
          style: {
            borderRadius: "0.75rem",
          },
        },
        /*#__PURE__*/ React.createElement(TileLayer, {
          attribution:
            '\xA9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        }),
        /*#__PURE__*/ React.createElement(
          Marker,
          {
            position: [latitude, longitude],
            icon: customIcon,
          },
          /*#__PURE__*/ React.createElement(
            Popup,
            null,
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-center p-1",
              },
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "font-semibold text-gray-900",
                },
                venueName,
              ),
              venueAddress &&
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-gray-600 mt-1",
                  },
                  venueAddress,
                ),
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex gap-3",
      },
      /*#__PURE__*/ React.createElement(
        "button",
        {
          onClick: openInGoogleMaps,
          className:
            "flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-lg  bg-gray-50 text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-100 hover:border-gray-300 active:scale-[0.98] transition-all duration-150",
        },
        /*#__PURE__*/ React.createElement(ExternalLink, {
          className: "w-4 h-4",
        }),
        "View on Maps",
      ),
      /*#__PURE__*/ React.createElement(
        "button",
        {
          onClick: getDirections,
          className:
            "flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-lg  bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.98] transition-all duration-150",
        },
        /*#__PURE__*/ React.createElement(Navigation, {
          className: "w-4 h-4",
        }),
        "Directions",
      ),
    ),
  );
}
