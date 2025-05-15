const os = require("os");
const path = require("path");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");

async function addWatermarkToImage(inputPath, metadata, address) {
  const image = sharp(inputPath);
  const { width, height } = await image.metadata();

  const svgText = `
  <svg width="${width}" height="${height}">
    <style>
      .title {
        fill: white;
        font-size: 84px;
        font-weight: bold;
        font-family: Arial;
        text-anchor: middle;
      }
      .info {
        fill: white;
        font-size: 72px;
        font-family: Arial;
      }
      rect {
        fill: rgba(0, 0, 0, 0.4);
      }
    </style>
    
    <!-- Top bar background -->
    <rect x="0" y="0" width="${width}" height="160" />
    <!-- Top title centered -->
    <text x="${
      width / 2
    }" y="110" class="title">OOHIQ by TrueNorth Media Monitoring</text>
    
    <!-- Bottom bar background -->
    <rect x="0" y="${height - 300}" width="${width}" height="300" />
    <!-- Metadata text with vertical spacing -->
    <text x="30" y="${height - 220}" class="info">
      Lat: ${metadata.latitude} | Long: ${metadata.longitude}
    </text>
    <text x="30" y="${height - 140}" class="info">
      Date: ${metadata.date} | Time: ${metadata.timestamp}
    </text>
    <text x="30" y="${height - 60}" class="info">
      Address: ${address}
    </text>
  </svg>
`;

  const outputPath = path.join(os.tmpdir(), `${Date.now()}_watermarked.jpg`);
  await image
    .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
    .jpeg()
    .toFile(outputPath);

  return outputPath;
}

async function videoWatermark(videoPath, topText) {
  const outputPath = path.join(os.tmpdir(), `${Date.now()}_watermarked.mp4`);
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilters([
        {
          filter: "drawtext",
          options: {
            fontfile: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            text: topText,
            fontcolor: "green",
            fontsize: 15,
            x: 10,
            y: 10,
          },
        },
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

module.exports = { addWatermarkToImage, videoWatermark };
