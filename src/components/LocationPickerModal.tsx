import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Navigation, Search, Check, ExternalLink, Loader2 } from 'lucide-react';
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
          // Format shorter address
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

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const startLat = initialLat || selectedLat;
    const startLng = initialLng || selectedLng;

    // Create high-contrast red pin icon with SVG
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

    // Add draggable marker
    const marker = L.marker([startLat, startLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // Handle marker drag
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setSelectedLat(pos.lat);
      setSelectedLng(pos.lng);
      fetchAddressHint(pos.lat, pos.lng);
    });

    // Handle click on map to move marker
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setSelectedLat(e.latlng.lat);
      setSelectedLng(e.latlng.lng);
      fetchAddressHint(e.latlng.lat, e.latlng.lng);
    });

    // Invalidate size after modal animation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Initial address hint
    fetchAddressHint(startLat, startLng);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen]);

  // Use GPS Location Handler
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung fitur lokasi GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLat(lat);
        setSelectedLng(lng);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
          markerRef.current.setLatLng([lat, lng]);
        }
        fetchAddressHint(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (err.code === 1) msg = 'Izin lokasi belum diberikan di browser HP Anda. Silakan izinkan akses lokasi.';
        else if (err.code === 2) msg = 'Sinyal GPS tidak tersedia.';
        else if (err.code === 3) msg = 'Deteksi GPS melebihi batas waktu (timeout).';
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search Address Handler (via OpenStreetMap Nominatim)
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=id&limit=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          setSelectedLat(lat);
          setSelectedLng(lng);

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
            markerRef.current.setLatLng([lat, lng]);
          }
          setAddressHint(first.display_name.split(',').slice(0, 3).join(','));
        } else {
          alert('Lokasi tidak ditemukan. Coba nama jalan atau kelurahan yang lebih spesifik.');
        }
      }
    } catch {
      alert('Gagal mencari lokasi. Silakan geser pin langsung pada peta.');
    } finally {
      setIsSearching(false);
    }
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
      <div className="bg-white rounded-3xl max-w-xl w-full h-[90vh] sm:h-[82vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-150">
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
                Geser pin atau klik peta untuk menentukan lokasi rumah Anda
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
        <div className="p-2.5 sm:p-3 bg-stone-50 border-b border-stone-200/80 flex flex-col sm:flex-row gap-2 shrink-0">
          {/* Search Input */}
          <form onSubmit={handleSearchAddress} className="flex-1 flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama jalan, komplek, atau area..."
                className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-100 placeholder:text-stone-400"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSearching ? 'Mencari...' : 'Cari'}
            </button>
          </form>

          {/* GPS Button */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={isLocating}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isLocating ? 'Mendeteksi GPS...' : '📍 Lokasi Saya (GPS)'}</span>
          </button>
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
              <span>Tes di Google Maps</span>
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
