"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface LocationPickerProps {
  value?: string;
  onChange: (location: string, coordinates?: { lat: number; lng: number }) => void;
  error?: string;
}

export function LocationPicker({ value = "", onChange, error }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>(value || "");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const markerRef = useRef<any>(null);

  // Default center (New Delhi, India)
  const defaultCenter: [number, number] = [28.6139, 77.2090];

  // Sync with external value
  useEffect(() => {
    const currentValue = value || "";
    if (currentValue && currentValue !== selectedLocation) {
      const coordMatch = currentValue.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        setPosition([lat, lng]);
        setCoordinates({ lat, lng });
        setSelectedLocation(currentValue.split(" (")[0]);
        
        // Update map if ready
        if (map) {
          map.setView([lat, lng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const L = (window as any).L;
            if (L) {
              const newMarker = L.marker([lat, lng]).addTo(map);
              markerRef.current = newMarker;
              setMarker(newMarker);
            }
          }
        }
      } else if (currentValue) {
        setSelectedLocation(currentValue);
      }
    }
  }, [value]);

  // Initialize map once
  useEffect(() => {
    if (mapReady) return; // Prevent re-initialization

    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (existingScript) {
      // Wait a bit for DOM to be ready
      setTimeout(initializeMap, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    script.async = true;
    
    script.onload = () => {
      setTimeout(initializeMap, 100);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (map) {
        try {
          map.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const initializeMap = () => {
    const L = (window as any).L;
    if (!L) {
      console.log('Leaflet not loaded yet');
      return;
    }

    // Check if map container already has a map
    const container = document.getElementById('leaflet-map-container');
    if (!container) {
      console.log('Container not found');
      return;
    }
    
    if ((container as any)._leaflet_id) {
      console.log('Map already initialized, skipping...');
      return;
    }

    try {
      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const mapInstance = L.map('leaflet-map-container').setView(position || defaultCenter, 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstance);

      // Add initial marker if position exists
      if (position) {
        const initialMarker = L.marker(position).addTo(mapInstance);
        markerRef.current = initialMarker;
        setMarker(initialMarker);
      }

      // Handle map clicks - store in a variable to ensure proper reference
      const clickHandler = (e: any) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        console.log('Map clicked at:', lat, lng);
        
        // Remove old marker using ref (synchronous access)
        if (markerRef.current) {
          try {
            mapInstance.removeLayer(markerRef.current);
            console.log('Removed old marker');
          } catch (err) {
            console.log('Error removing marker:', err);
          }
        }

        // Add new marker
        const newMarker = L.marker([lat, lng]).addTo(mapInstance);
        markerRef.current = newMarker;
        setMarker(newMarker);
        console.log('Added new marker');

        setPosition([lat, lng]);
        setCoordinates({ lat, lng });

        // Center map on new position
        mapInstance.setView([lat, lng], mapInstance.getZoom());
        
        // Get address from coordinates
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        )
          .then((res) => res.json())
          .then((data) => {
            const address = data.display_name || `${lat}, ${lng}`;
            setSelectedLocation(address);
            onChange(`${address} (${lat}, ${lng})`, { lat, lng });
          })
          .catch(() => {
            const fallback = `${lat}, ${lng}`;
            setSelectedLocation(fallback);
            onChange(`${fallback} (${lat}, ${lng})`, { lat, lng });
          });
      };

      mapInstance.on('click', clickHandler);

      setMap(mapInstance);
      setMapReady(true);
      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const L = (window as any).L;
    if (!L || !map) return;

    // Remove old marker using ref
    if (markerRef.current) {
      try {
        map.removeLayer(markerRef.current);
      } catch (err) {
        console.log('Error removing marker in handleMapClick:', err);
      }
    }

    // Add new marker
    const newMarker = L.marker([lat, lng]).addTo(map);
    markerRef.current = newMarker;
    setMarker(newMarker);
    setPosition([lat, lng]);
    setCoordinates({ lat, lng });

    // Center map on new position
    map.setView([lat, lng], map.getZoom());
    
    // Get address from coordinates
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    )
      .then((res) => res.json())
      .then((data) => {
        const address = data.display_name || `${lat}, ${lng}`;
        setSelectedLocation(address);
        onChange(`${address} (${lat}, ${lng})`, { lat, lng });
      })
      .catch(() => {
        const fallback = `${lat}, ${lng}`;
        setSelectedLocation(fallback);
        onChange(`${fallback} (${lat}, ${lng})`, { lat, lng });
      });
  }, [map, onChange]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (map) {
          map.setView([latitude, longitude], 15);
        }
        
        handleMapClick(latitude, longitude);
        setIsLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to get your location. Please click on the map to select a location.");
        setIsLoading(false);
      }
    );
  }, [map, handleMapClick]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 mb-2 flex-wrap items-center">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Getting Location..." : "📍 Use Current Location"}
        </button>
        {coordinates && (
          <div className="text-sm text-gray-600">
            Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
          </div>
        )}
      </div>

      <div 
        id="leaflet-map-container"
        className="border rounded-md overflow-hidden" 
        style={{ height: "400px", width: "100%" }}
      />

      <input
        type="text"
        value={selectedLocation || value || ""}
        onChange={(e) => {
          const newValue = e.target.value;
          setSelectedLocation(newValue);
          if (coordinates) {
            onChange(`${newValue} (${coordinates.lat}, ${coordinates.lng})`, coordinates);
          } else {
            onChange(newValue);
          }
        }}
        placeholder="Click on map or use current location"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      <p className="text-xs text-gray-500 mt-1">
        Click on the map or use the button to get your current location
      </p>
    </div>
  );
}