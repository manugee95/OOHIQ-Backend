const { execSync } = require("child_process");
const path = require("path");

exports.validateImages = (closeShotPath, longShotPath) => {
  return new Promise((resolve, reject) => {
    try {
      const result = execSync(
        `python "${path.resolve(
          __dirname,
          "../validate_images.py"
        )}" "${path.resolve(closeShotPath)}" "${path.resolve(longShotPath)}"`,
        { encoding: "utf8" }
      );

      // If the script exits with a success code, images are valid
      resolve(true);
    } catch (error) {
      console.error("Error validating images:", error.message);
      resolve(false); // Treat validation failure as invalid images
    }
  });
};

exports.validateImageLocation = (imagePath, location, maxDistance) => {
  const { latitude, longitude } = location;
  const locationStr = `${latitude},${longitude}`;

  return new Promise((resolve, reject) => {
    try {
      // Execute Python script to validate image location
      const result = execSync(
        `python validate_image_location.py "${imagePath}" "${locationStr}" ${maxDistance}`,
        { encoding: "utf8" }
      ).trim();

      resolve(result === "True");
    } catch (error) {
      console.error("Error validating image location:", error);
      reject(
        new Error(
          "Error executing the Python script. Check if 'validate_image_location.py' exists and is correctly implemented."
        )
      );
    }
  });
};

exports.validateVideoLocation = (videoPath, location, maxDistance) => {
  const { latitude, longitude } = location;
  const locationStr = `${latitude},${longitude}`;

  return new Promise((resolve, reject) => {
    try {
      const result = execSync(
        `python validate_video_location.py "${videoPath}" "${locationStr}" ${maxDistance}`,
        { encoding: "utf8" }
      ).trim();

      if (result === "True") {
        resolve(true);
      } else if (result.includes("No GPS data found")) {
        console.error("Video does not contain GPS data.");
        resolve(false); // Gracefully resolve as invalid
      } else if (result === "False") {
        resolve(false);
      } else {
        console.error("Unexpected script output:", result);
        reject(new Error("Unexpected script output: " + result));
      }
    } catch (error) {
      console.error(
        "Error executing the Python script. Check if 'validate_video_location.py' exists and is correctly implemented."
      );
      reject(error);
    }
  });
};
