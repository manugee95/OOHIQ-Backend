const fileType = require("file-type");
const heicConvert = require("heic-convert");
const {execSync} = require("child_process")
const os = require("os");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const convertImageToJpg = async (inputPath) => {
  const type = await fileType.fromFile(inputPath);

  const outputPath = path.join(os.tmpdir(), `${Date.now()}_image.jpg`);

  //Convert Iphone Images to Jpeg
  if (type && type.ext === "heic") {
    // const inputBuffer = fs.readFileSync(inputPath);
    // const outputBuffer = await heicConvert({
    //   buffer: inputBuffer,
    //   format: "JPEG",
    //   quality: 1,
    // });
    // fs.writeFileSync(outputPath, outputBuffer);
    execSync(`magick "${inputPath}" "${outputPath}"`)
    return outputPath;
  }

  // Standard image conversion for other formats
  await sharp(inputPath).jpeg().toFile(outputPath);
  return outputPath;
};

const convertVideoToMp4 = async (inputPath) => {
  const outputPath = path.join(os.tmpdir(), `${Date.now()}_video.mp4`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec("libx264")
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
};

module.exports = { convertImageToJpg, convertVideoToMp4 };
