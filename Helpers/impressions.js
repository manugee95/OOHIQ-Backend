function scoreTrafficSpeed(speed) {
  const map = { FAST: 4, AVERAGE: 7, SLOW: 10 };
  return map[speed.toUpperCase()] || 0;
}

function scoreEvaluationTime(time) {
  const map = { LOW: 4, AVERAGE: 7, PEAK: 10 };
  return map[time.toUpperCase()] || 0;
}

function scoreVehicleCount(count) {
  if (count >= 300) return 10;
  if (count >= 200) return 8;
  if (count >= 100) return 6;
  if (count >= 50) return 4;
  if (count >= 10) return 2;
  return 0;
}

function scorePedestrianCount(count) {
  if (count >= 100) return 10;
  if (count >= 70) return 7;
  if (count >= 50) return 5;
  if (count >= 20) return 2;
  return 0;
}

function impressionScore({ trafficSpeed, evaluationTime, objectCounts }) {
  const vehicleCount =
    (objectCounts.car || 0) +
    (objectCounts.bus || 0) +
    (objectCounts.truck || 0) +
    (objectCounts.motorcycle || 0);
  const pedestrianCount = objectCounts.person || 0;

  const speedScore = scoreTrafficSpeed(trafficSpeed);
  const timeScore = scoreEvaluationTime(evaluationTime);
  const vehicleScore = scoreVehicleCount(vehicleCount);
  const pedestrianScore = scorePedestrianCount(pedestrianCount);

  const total = (speedScore + timeScore + vehicleScore + pedestrianScore) / 4;
  return Math.round((total / 10) * 100);
}

module.exports = { impressionScore };
