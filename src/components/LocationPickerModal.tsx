import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Navigation, Search, Check, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  onSelectLocation: (data: {
    lat: number;
    lng: number;
    mapsUrl: string;
    addressHint?: string;
  }) => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

// Default center: Indonesia (Balikpapan / East Kalimantan region)
const DEFAULT_LAT = -1.265386;
const DEFAULT_LNG = 116.831200;

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [selectedLat, setSelectedLat] = useState<number>(initialLat || DEFAULT_LAT);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng || DEFAULT_LNG);
  const [addressHint, setAddressHint] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  // Generate Google Maps URL
  const googleMapsUrl = `https://maps.google.com/?q=${selectedLat.toFixed(6)},${selectedLng.toFixed(6)}`;

  // Reverse geocode to get street name
  const fetchAddressHint = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const road = data.address?.road || data.address?.pedestrian || '';
          const suburb = data.address?.suburb || data.address?.village || data.address?.neighbourhood || '';
          const city = data.address?.city || data.address?.county || '';
          const hint = [road, suburb, city].filter(Boolean).join(', ');
          setAddressHint(hint || data.display_name.split(',').slice(0, 3).join(','));
        }
      }
    } catch {
      // Non-blocking
    }
  };

  // Move marker and pan map
  const applyCoordinates = (lat: number, lng: number, label?: string, zoomLevel = 17) => {
    setSelectedLat(lat);
    setSelectedLng(lng);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoomLevel, { duration: 1.0 });
      markerRef.current.setLatLng([lat, lng]);
    }
    if (label) {
      setAddressHint(label);
    } else {
      fetchAddressHint(lat, lng);
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const startLat = initialLat || selectedLat;
    const startLng = initialLng || selectedLng;

    // High-contrast custom SVG red pin
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="transform: translate(-50%, -100%);">
          <svg width="34" height="42" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 18.5 10 28.5 11.2 29.7C11.6 30.1 12.4 30.1 12.8 29.7C14 28.5 24 18.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#DC2626"/>
            <circle cx="12" cy="11" r="5" fill="#FFFFFF"/>
            <circle cx="12" cy="11" r="2.5" fill="#DC2626"/>
          </svg>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 16,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // Free OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Draggable marker
    const marker = L.marker([startLat, startLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setSelectedLat(pos.lat);
      setSelectedLng(pos.lng);
      fetchAddressHint(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setSelectedLat(e.latlng.lat);
      setSelectedLng(e.latlng.lng);
      fetchAddressHint(e.latlng.lat, e.latlng.lng);
    });

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    fetchAddressHint(startLat, startLng);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen]);

  // Use GPS Location with 2-Phase Fallback (High Accuracy -> Coarse Network)
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'warning',
        text: 'Browser/perangkat Anda tidak mendukung fitur lokasi GPS. Anda dapat langsung menggeser pin merah pada peta.',
      });
      return;
    }

    setIsLocating(true);
    setFeedback(null);

    // Phase 1: Try GPS with high accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        applyCoordinates(pos.coords.latitude, pos.coords.longitude, undefined, 17);
        setFeedback({
          type: 'success',
          text: '✓ Lokasi GPS berhasil ditemukan! Pin otomatis diposisikan.',
        });
        setTimeout(() => setFeedback(null), 4000);
      },
      (highErr) => {
        // If permission was strictly denied by user (code 1)
        if (highErr.code === 1) {
          setIsLocating(false);
          setFeedback({
            type: 'warning',
            text: 'Izin GPS belum diizinkan di browser Anda. Silakan klik atau geser pin merah langsung ke titik rumah Anda.',
          });
          return;
        }

        // Phase 2: High accuracy timed out or unavailable, try low accuracy (network/cellular)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLocating(false);
            applyCoordinates(pos.coords.latitude, pos.coords.longitude, undefined, 16);
            setFeedback({
              type: 'success',
              text: '✓ Titik lokasi berhasil dideteksi melalui sinyal jaringan.',
            });
            setTimeout(() => setFeedback(null), 4000);
          },
          (lowErr) => {
            setIsLocating(false);
            let msg = 'Sinyal GPS tidak terdeteksi. Silakan ketik nama lokasi di atas atau geser pin merah pada peta.';
            if (lowErr.code === 1) {
              msg = 'Izin lokasi belum aktif. Anda tetap dapat menentukan lokasi dengan menggeser pin merah pada peta.';
            }
            setFeedback({
              type: 'warning',
              text: msg,
            });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 4500, maximumAge: 10000 }
    );
  };

  // Robust Search (Photon POI geocoder + OpenStreetMap Nominatim fallback)
  const performSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsSearching(true);
    setFeedback(null);
    setSearchResults([]);
    setShowDropdown(false);

    const items: SearchResultItem[] = [];

    // 1. Try Photon (Fast, POI aware, Indonesian friendly, Proximity ranked)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lat=${selectedLat}&lon=${selectedLng}`;
      const res = await fetch(photonUrl);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.features) && json.features.length > 0) {
          json.features.forEach((feat: any, idx: number) => {
            const coords = feat.geometry?.coordinates;
            if (coords && coords.length >= 2) {
              const p = feat.properties || {};
              const title = p.name || p.street || q;
              const subparts = [p.street, p.district, p.city, p.state, p.country].filter(Boolean);
              // Deduplicate title from subparts
              const filteredSub = subparts.filter((s) => s.toLowerCase() !== title.toLowerCase());
              items.push({
                id: `photon-${idx}-${coords[0]}-${coords[1]}`,
                title,
                subtitle: filteredSub.join(', ') || 'Indonesia',
                lat: coords[1],
                lng: coords[0],
              });
            }
          });
        }
      }
    } catch {
      // Continue to Nominatim fallback
    }

    // 2. If Photon found no items, try Nominatim fallback
    if (items.length === 0) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
        const nomRes = await fetch(nomUrl, { headers: { 'Accept-Language': 'id' } });
        if (nomRes.ok) {
          const nomList = await nomRes.json();
          if (Array.isArray(nomList) && nomList.length > 0) {
            nomList.forEach((n: any, idx: number) => {
              const lat = parseFloat(n.lat);
              const lng = parseFloat(n.lon);
              if (!isNaN(lat) && !isNaN(lng)) {
                const parts = (n.display_name || '').split(',');
                const title = parts[0]?.trim() || q;
                const subtitle = parts.slice(1, 4).map((s: string) => s.trim()).join(', ');
                items.push({
                  id: `nom-${idx}-${lat}-${lng}`,
                  title,
                  subtitle: subtitle || 'Indonesia',
                  lat,
                  lng,
                });
              }
            });
          }
        }
      } catch {
        // Fallback catch
      }
    }

    setIsSearching(false);

    if (items.length === 0) {
      setFeedback({
        type: 'warning',
        text: `Lokasi "${q}" tidak ditemukan. Coba ketik nama jalan utama atau geser pin merah langsung pada peta.`,
      });
      setShowDropdown(false);
    } else if (items.length === 1) {
      // Direct jump for single result
      const target = items[0];
      applyCoordinates(target.lat, target.lng, `${target.title}, ${target.subtitle}`, 17);
      setFeedback({
        type: 'success',
        text: `✓ Menemukan: ${target.title}`,
      });
      setTimeout(() => setFeedback(null), 3000);
      setShowDropdown(false);
    } else {
      // Show choices
      setSearchResults(items);
      setShowDropdown(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    applyCoordinates(item.lat, item.lng, `${item.title}, ${item.subtitle}`, 17);
    setShowDropdown(false);
    setSearchQuery(item.title);
    setFeedback({
      type: 'success',
      text: `✓ Pin dipindahkan ke ${item.title}`,
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleConfirmLocation = () => {
    onSelectLocation({
      lat: selectedLat,
      lng: selectedLng,
      mapsUrl: googleMapsUrl,
      addressHint,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full h-[92vh] sm:h-[84vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-xs sm:text-sm">
                Pilih Titik Lokasi Pengantaran
              </h3>
              <p className="text-[10.5px] text-stone-500">
                Geser pin merah atau gunakan pencarian untuk menentukan alamat rumah
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & GPS Quick Actions */}
        <div className="p-2.5 sm:p-3 bg-stone-50 border-b border-stone-200/80 shrink-0 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (showDropdown) setShowDropdown(false);
                    }}
                    placeholder="Cari gedung, toko, jalan (contoh: karunia group, jl ahmad yani)..."
                    className="w-full pl-8 pr-2 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 placeholder:text-stone-400 shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-stone-800 hover:bg-stone-900 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isSearching ? 'Mencari...' : 'Cari'}</span>
                </button>
              </form>

              {/* Suggestions Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-stone-100">
                  <div className="px-3 py-1.5 bg-stone-50 text-[10px] font-bold text-stone-500 flex justify-between items-center">
                    <span>Pilih Hasil Pencarian:</span>
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      Tutup
                    </button>
                  </div>
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3 py-2 hover:bg-red-50/70 transition flex items-start gap-2 cursor-pointer group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs text-stone-900 truncate group-hover:text-red-700">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleUseGPS}
              disabled={isLocating}
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>{isLocating ? 'Mendeteksi...' : '📍 Lokasi Saya (GPS)'}</span>
            </button>
          </div>

          {/* Inline Feedback Banner (No window.alert) */}
          {feedback && (
            <div
              className={`text-xs px-3 py-2 rounded-xl flex items-start gap-2 animate-in fade-in duration-150 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-amber-50 text-amber-950 border border-amber-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              )}
              <span className="text-[11px] leading-tight font-medium flex-1">
                {feedback.text}
              </span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold leading-none shrink-0"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Leaflet Map Area */}
        <div className="relative flex-1 w-full bg-stone-100 min-h-0">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Instructions Banner */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 bg-stone-900/85 backdrop-blur-xs text-white text-[10.5px] font-bold px-3 py-1 rounded-full shadow-md pointer-events-none text-center whitespace-nowrap">
            Klik peta atau geser pin merah ke titik rumah Anda
          </div>
        </div>

        {/* Footer Confirmation Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Titik Terpilih:
              </span>
              <p className="font-extrabold text-stone-900 truncate text-xs sm:text-[13px]">
                {addressHint || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`}
              </p>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 transition shrink-0"
              title="Buka titik koordinat di Google Maps"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Tes di Google Maps ↗</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleConfirmLocation}
              className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Gunakan Titik Lokasi Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
