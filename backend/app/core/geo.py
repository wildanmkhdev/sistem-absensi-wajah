import math
import os
from typing import Tuple

# Radius bumi dalam meter (WGS 84 mean radius)
EARTH_RADIUS_METERS: float = 6371000.0

# Koordinat Ruang Kuliah Default (Kampus / Gedung Perkuliahan)
# Dapat dikonfigurasi melalui environment variable
DEFAULT_CLASSROOM_LAT: float = float(os.getenv("CLASSROOM_LAT", "-6.200000"))
DEFAULT_CLASSROOM_LON: float = float(os.getenv("CLASSROOM_LON", "106.816666"))

# Batas toleransi jarak berdasarkan regulasi kehadiran
MAX_VALID_DISTANCE_METERS: float = 50.0
MAX_OVERSIGHT_DISTANCE_METERS: float = 100.0


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Menghitung jarak geosains antara dua pasang koordinat lintang & bujur
    menggunakan formula Haversine dalam satuan meter.

    Formula:
        a = sin^2(Δlat/2) + cos(lat1) * cos(lat2) * sin^2(Δlon/2)
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        d = R * c
    """
    # Validasi titik identik
    if lat1 == lat2 and lon1 == lon2:
        return 0.0

    # Konversi derajat ke radian
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    
    # Clip a ke [0.0, 1.0] untuk menghindari domain error pada floating point precision
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = EARTH_RADIUS_METERS * c

    return round(distance, 2)


def calculate_classroom_distance(
    user_lat: float,
    user_lon: float,
    classroom_lat: float = DEFAULT_CLASSROOM_LAT,
    classroom_lon: float = DEFAULT_CLASSROOM_LON,
) -> float:
    """
    Menghitung jarak posisi pengguna ke lokasi ruang kelas default.
    """
    return calculate_distance(user_lat, user_lon, classroom_lat, classroom_lon)


def get_classroom_coords() -> Tuple[float, float]:
    """
    Mengambil koordinat ruang kelas resmi.
    """
    return DEFAULT_CLASSROOM_LAT, DEFAULT_CLASSROOM_LON


def generate_coords_at_distance(
    distance_meters: float,
    base_lat: float = DEFAULT_CLASSROOM_LAT,
    base_lon: float = DEFAULT_CLASSROOM_LON,
) -> Tuple[float, float]:
    """
    Helper untuk menghasilkan koordinat uji coba yang berjarak persis X meter
    ke arah utara dari titik kelas. Sangat berguna untuk pengujian benchmark M1-M6.
    """
    # 1 derajat lintang ≈ 111,139 meter
    delta_lat = distance_meters / 111139.0
    return round(base_lat + delta_lat, 6), base_lon
