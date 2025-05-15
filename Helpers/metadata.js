const { exiftool } = require("exiftool-vendored");

async function extractImageMetadata(imagePath) {
  try {
    const data = await exiftool.read(imagePath);

    const latitude = data.GPSLatitude || "N/A";
    const longitude = data.GPSLongitude || "N/A";
    const date = data.DateTimeOriginal
      ? new Date(data.DateTimeOriginal).toISOString().split("T")[0]
      : "N/A";
    const timestamp = data.DateTimeOriginal
      ? new Date(data.DateTimeOriginal)
          .toISOString()
          .split("T")[1]
          .split(".")[0]
      : "N/A";

    return {
      latitude,
      longitude,
      date,
      timestamp,
    };
  } catch (error) {
    console.error("Metadata extraction failed:", error.message);
    return {
      latitude: "N/A",
      longitude: "N/A",
      date: "N/A",
      timestamp: "N/A",
    };
  }
}

module.exports = extractImageMetadata;
