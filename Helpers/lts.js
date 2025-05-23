//Location Details Score
function scoreRoadType(type) {
  const map = {
    HIGHWAY: 10,
    "MAJOR ROAD": 8,
    "MINOR ROAD": 6,
    "INTER CITY": 7,
    "INTRA CITY": 7,
    OTHERS: 5,
  };
  return map[type.toUpperCase() || 0];
}

function scoreVehicularTraffic(traffic) {
  const map = { ROUNDABOUT: 10, JUNCTION: 8, "TRAFFIC LIGHT CONTROL": 8 };
  return map[traffic.toUpperCase() || 0];
}

function scorePedestrianTraffic(traffic) {
  const map = {
    MARKET: 10,
    "BUS STOP": 8,
    SCHOOL: 8,
    "OFFICE COMPLEX": 7,
    "MOTOR PARK": 7,
    SHOPPING: 6,
    OTHER: 5,
  };
  return map[traffic.toUpperCase() || 0];
}

//Visibility & Impact Score
function scoreDistanceOfVisibility(distance) {
  const map = {
    "500 METRES": 10,
    "200 METRES": 8,
    "100 METRES": 7,
    "50 METRES": 5,
    "20 METRES": 3,
  };
  return map[distance.toUpperCase() || 0];
}

function scoreBoardPositioning(position) {
  const map = { "HEAD ON": 10, MIDDLE: 8, LEFT: 6, RIGHT: 6 };
  return map[position.toUpperCase() || 0];
}

function scoreBoardLevel(level) {
  const map = {
    "AT EYE LEVEL": 10,
    "ABOVE EYE LEVEL": 8,
    "BELOW EYE LEVEL": 5,
  };
  return map[level.toUpperCase() || 0];
}

function scoreVisibilityPoints(direction) {
  const map = {
    MORE: 10,
    "THREE DIRECTIONS": 9,
    "TWO DIRECTIONS": 7,
    "ONE DIRECTION": 5,
  };
  return map[direction.toUpperCase() || 0];
}

function scoreSpecialFeatures(feature) {
  const map = {
    "ULTRA WAVE": 10,
    "ILLUMINATED FRONT LIT": 8,
    "ILLUMINATED BACK LIT": 7,
    "NON-ILLUMINATED": 4,
  };
  return map[feature.toUpperCase() || 0];
}

//Competitiveness
function scoreBoardsInView(view) {
  const map = { "1-3": 10, "4-6": 7, "7-10": 5 };
  return map[view.toUpperCase() || 0];
}

function scoreCompetitiveBoards(competitive) {
  const map = { "1-3": 10, "4-6": 6, "7-10": 3 };
  return map[competitive.toUpperCase() || 0];
}

function scoreLargerBoards(larger) {
  const map = { "1-3": 10, "4-6": 6, "7-10": 3 };
  return map[larger.toUpperCase() || 0];
}

module.exports = {
  scoreRoadType,
  scoreVehicularTraffic,
  scorePedestrianTraffic,
  scoreDistanceOfVisibility,
  scoreBoardPositioning,
  scoreBoardLevel,
  scoreVisibilityPoints,
  scoreSpecialFeatures,
  scoreBoardsInView,
  scoreCompetitiveBoards,
  scoreLargerBoards
};
