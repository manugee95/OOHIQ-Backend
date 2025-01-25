import sys
import subprocess
from geopy.distance import geodesic

def get_video_metadata(video_path):
    try:
        result = subprocess.run(
            ["exiftool", video_path],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except Exception as e:
        return None

def get_gps_data(metadata):
    try:
        lines = metadata.splitlines()
        latitude = None
        longitude = None

        for line in lines:
            if "GPS Latitude" in line:
                latitude = parse_gps_value(line.split(":")[1].strip())
            if "GPS Longitude" in line:
                longitude = parse_gps_value(line.split(":")[1].strip())

        if latitude is not None and longitude is not None:
            return (latitude, longitude)
        return None
    except Exception:
        return None

def parse_gps_value(gps_string):
    """Convert GPS degrees, minutes, and seconds to decimal format."""
    try:
        parts = gps_string.replace("deg", "").replace("'", "").replace('"', "").split()
        degrees = float(parts[0])
        minutes = float(parts[1]) / 60
        seconds = float(parts[2]) / 3600
        decimal = degrees + minutes + seconds
        if parts[3] in ["S", "W"]:  # South or West means negative
            decimal *= -1
        return decimal
    except Exception:
        return None

def validate_video_location(video_path, target_coords, max_distance):
    metadata = get_video_metadata(video_path)
    if not metadata:
        return False

    gps_coords = get_gps_data(metadata)
    if not gps_coords:
        return False

    distance = geodesic(gps_coords, target_coords).meters
    return distance <= max_distance

if __name__ == "__main__":
    video_path = sys.argv[1]
    target_coords = tuple(map(float, sys.argv[2].split(",")))
    max_distance = float(sys.argv[3])

    is_valid = validate_video_location(video_path, target_coords, max_distance)
    print(is_valid)
