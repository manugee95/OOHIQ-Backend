import sys
from geopy.distance import geodesic
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def get_gps_data(image_path):
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        if not exif_data:
            return None

        gps_info = {}
        for tag, value in exif_data.items():
            tag_name = TAGS.get(tag)
            if tag_name == "GPSInfo":
                for gps_tag in value:
                    sub_tag_name = GPSTAGS.get(gps_tag, gps_tag)
                    gps_info[sub_tag_name] = value[gps_tag]

        if not gps_info:
            return None

        # Extract GPS coordinates
        def convert_to_degrees(value):
            d, m, s = value
            return d + (m / 60.0) + (s / 3600.0)

        latitude = convert_to_degrees(gps_info["GPSLatitude"])
        longitude = convert_to_degrees(gps_info["GPSLongitude"])

        # Adjust for N/S/E/W
        if gps_info["GPSLatitudeRef"] != "N":
            latitude = -latitude
        if gps_info["GPSLongitudeRef"] != "E":
            longitude = -longitude

        return (latitude, longitude)
    except Exception as e:
        print(f"Error extracting GPS data: {e}")
        return None

def validate_image_location(image_path, target_coords, max_distance):
    gps_coords = get_gps_data(image_path)
    if not gps_coords:
        print("No GPS data found in the image.")
        return False

    distance = geodesic(gps_coords, target_coords).meters
    return distance <= max_distance

if __name__ == "__main__":
    image_path = sys.argv[1]
    target_coords = tuple(map(float, sys.argv[2].split(",")))
    max_distance = float(sys.argv[3])

    if validate_image_location(image_path, target_coords, max_distance):
        print("True")
    else:
        print("False")
