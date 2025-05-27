const fileType = require("file-type");
const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const sharp = require("sharp");

const convertImageToJpg = async (inputPath) => {
  const type = await fileType.fromFile(inputPath);

  const outputPath = path.join(os.tmpdir(), `${Date.now()}_image.jpg`);

  //Convert Iphone Images to Jpeg
  if (type && type.ext === "heic") {
    execSync(`magick "${inputPath}" "${outputPath}"`);
    return outputPath;
  }

  // Standard image conversion for other formats
  await sharp(inputPath).jpeg().toFile(outputPath);
  return outputPath;
};

module.exports = { convertImageToJpg };
