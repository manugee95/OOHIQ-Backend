const vision = require("@google-cloud/video-intelligence").v1;
const fs = require("fs");

async function analyzeVideoObjects(videoPath) {
  const client = new vision.VideoIntelligenceServiceClient();

  const inputContent = fs.readFileSync(videoPath);

  const request = {
    inputContent: inputContent.toString("base64"),
    features: ["OBJECT_TRACKING"],
  };

  const [operation] = await client.annotateVideo(request);
  const [operationResult] = await operation.promise();
  const annotations = operationResult.annotationResults[0].objectAnnotations;

  const objectCounts = {};
  for (const annotation of annotations) {
    const entity = annotation.entity.description.toLowerCase();
    objectCounts[entity] = (objectCounts[entity] || 0) + 1;
  }

  return objectCounts;
}

module.exports = {analyzeVideoObjects}