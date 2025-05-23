function gradeSite(score) {
  if (score >= 85) {
    return "A";
  } else if (score >= 70) {
    return "B";
  } else if (score >= 55) {
    return "C";
  } else if (score >= 40) {
    return "D";
  } else {
    return "E";
  }
}

module.exports = {gradeSite}