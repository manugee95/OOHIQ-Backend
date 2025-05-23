const vision = require("@google-cloud/video-intelligence").v1;

async function analyzeVideoObjects(gcsUri) {
  const client = new vision.VideoIntelligenceServiceClient();

  const request = {
    inputUri: gcsUri,
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