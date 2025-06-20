const { Storage } = require("@google-cloud/storage");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();

// Initialize Google Cloud Storage with environment-based credentials
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GCLOUD_CLIENT_EMAIL,
    private_key: process.env.GCLOUD_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

const bucket = storage.bucket(process.env.GCLOUD_BUCKET_NAME);

// Function to upload Profile Picture to GCS
const profileToGCS = async (file) => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(Date.now() + path.extname(file.originalname)); // Create a unique filename
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype, // Ensure the correct content type
    });

    blobStream.on("error", (err) => {
      reject(err);
    });

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
    blobStream.end(file.buffer);
  });
};

// Function to upload a file to Google Cloud Storage
const uploadToGCS = async (filePath, retries = 3) => {
  return new Promise((resolve, reject) => {
    if (!filePath || typeof filePath !== "string") {
      return reject(
        new TypeError(`Invalid file path provided for upload: ${filePath}`)
      );
    }

    // Create a unique filename
    const uniqueFilename = `${Date.now()}${path.extname(filePath)}`;
    const blob = bucket.file(uniqueFilename);

    // Create a writable stream to GCS
    const blobStream = blob.createWriteStream({
      resumable: true, // Allows automatic retries
      timeout: 60000, // 60 seconds timeout
      contentType: "auto",
    });

    let attempt = 0;

    // Function to retry upload on failure
    const attemptUpload = () => {
      attempt++;

      fs.createReadStream(filePath)
        .pipe(blobStream)
        .on("error", async (err) => {
          console.error(`Upload attempt ${attempt} failed: ${err.message}`);

          if (attempt < retries) {
            console.log(
              `Retrying upload in ${Math.pow(2, attempt) * 1000}ms...`
            );
            setTimeout(attemptUpload, Math.pow(2, attempt) * 1000);
          } else {
            reject(
              new Error(
                `Failed to upload ${filePath} after ${retries} attempts.`
              )
            );
          }
        })
        .on("finish", async () => {
          try {
            resolve(
              `https://storage.googleapis.com/${bucket.name}/${blob.name}`
            );
          } catch (err) {
            reject(err);
          }
        });
    };

    attemptUpload();
  });
};

function convertToGcsUri(publicUrl) {
  const match = publicUrl.match(
    /https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)/
  );
  if (!match) {
    throw new Error(`Invalid GCS public URL format: ${publicUrl}`);
  }
  return `gs://${match[1]}/${match[2]}`;
}

module.exports = { uploadToGCS, convertToGcsUri, profileToGCS };
