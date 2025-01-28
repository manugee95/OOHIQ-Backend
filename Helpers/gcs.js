const { Storage } = require("@google-cloud/storage");
const fs = require("fs");
const path = require("path");

require('dotenv').config();


// Initialize Google Cloud Storage with environment-based credentials
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GCLOUD_CLIENT_EMAIL,
    private_key: process.env.GCLOUD_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

const bucket = storage.bucket(process.env.GCLOUD_BUCKET_NAME);

// Function to upload to GCS
const uploadToGCS = async (filePath) => {
  return new Promise((resolve, reject) => {
    // Validate that the filePath is a valid string
    if (!filePath || typeof filePath !== "string") {
      return reject(
        new TypeError(`Invalid file path provided for upload: ${filePath}`)
      );
    }

    // Read the file into a buffer
    fs.readFile(filePath, (err, buffer) => {
      if (err) {
        return reject(err);
      }

      // Create a unique filename
      const uniqueFilename = `${Date.now()}${path.extname(filePath)}`;
      const blob = bucket.file(uniqueFilename);

      // Create a write stream to GCS
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: "auto", // Let GCS infer the content type
      });

      // Handle stream errors
      blobStream.on("error", (err) => {
        reject(err);
      });

      // Resolve the public URL after upload is complete
      blobStream.on("finish", () => {
        blob
          .makePublic()
          .then(() => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            resolve(publicUrl);
          })
          .catch((err) => reject(err));
      });

      // Write the file buffer to GCS
      blobStream.end(buffer);
    });
  });
};

module.exports = { uploadToGCS };
