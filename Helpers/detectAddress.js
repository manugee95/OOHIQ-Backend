const axios = require("axios");

async function getDetectedAddress(latitude, longitude) {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const response = await axios.get(geocodeUrl);

  if (response.data.status !== "OK") {
    throw new Error("Failed to detect location address.");
  }

  const address =
    response.data.results[0]?.formatted_address || "Unknown Address";
  const addressComponents = response.data.results[0]?.address_components;

  if (!addressComponents) {
    return { state: "Unknown", city: "Unknown", country: "Unknown" };
  }

  let city = "Unknown";
  let state = "Unknown";
  let country = "Unknown";

  for (const component of addressComponents) {
    if (component.types.includes("administrative_area_level_1")) {
      state = component.long_name;
    }
    if (
      component.types.includes("locality") ||
      component.types.includes("administrative_area_level_2")
    ) {
      city = component.long_name;
    }
    if (component.types.includes("country")) {
      country = component.long_name;
    }
  }

  return { address, state, city, country };
}

module.exports = {getDetectedAddress}