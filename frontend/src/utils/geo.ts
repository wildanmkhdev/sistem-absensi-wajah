// Perhitungan Jarak Menggunakan Formula Haversine (Modul 13 Kelompok 6)

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

/**
 * Menghasilkan koordinat dummy dengan jarak tertentu (dalam meter) dari titik acuan
 */
export function getCoordinatesAtDistance(
  baseLat: number,
  baseLon: number,
  distanceMeters: number,
  bearingDegrees: number = 45
): { latitude: number; longitude: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const δ = distanceMeters / EARTH_RADIUS_METERS;
  const θ = toRad(bearingDegrees);
  const φ1 = toRad(baseLat);
  const λ1 = toRad(baseLon);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    latitude: Math.round(toDeg(φ2) * 1000000) / 1000000,
    longitude: Math.round(toDeg(λ2) * 1000000) / 1000000,
  };
}

/**
 * Format jarak manusiawi: meter bila < 1000m, kilometer bila >= 1000m
 * Contoh: 45 m, 70 m, 8.4 km, 1.420 km
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || Number.isNaN(meters)) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  if (km < 100) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km).toLocaleString('id-ID')} km`;
}
