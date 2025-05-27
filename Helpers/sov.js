function scoreBillboards(board) {
  const map = {
    "48 SHEET": 0.3,
    "SUPER 48 SHEET": 0.4,
    PORTRAIT: 0.3,
    "40 SHEET": 0.25,
    GANTRY: 0.8,
    "ROOF TOP": 0.6,
    "UNI POLE": 0.7,
    "WALL DRAPE": 1.0,
    "STREET LIGHT": 0.2,
    "WATER TANK": 0.3,
    "VEHICLE BRIDGE STRIP": 0.4,
    "PEDESTRIAN BRIDGE STRIP": 0.5,
    "ROUND TANK": 0.3,
    "EYE CATCHER": 0.9,
    "BACK LIT": 0.3,
    OTHERS: 0.2,
  };

  return map[board.toUpperCase() || 0];
}

function calculateSovScore(clientBoard, allBoardsOnSite) {
  const clientScore = scoreBillboards(clientBoard);
  const totalScore = allBoardsOnSite.reduce((sum, type) => {
    return sum + scoreBillboards(type);
  }, 0);

  if (totalScore === 0) return 0;

  const sov = (clientScore / totalScore) * 100;
  return Math.round(sov * 100) / 100;
}

module.exports = { calculateSovScore };
