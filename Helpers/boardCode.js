async function generateBoardCode(prisma) {
  let boardCode;
  let exists = true;

  while (exists) {
    const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(
      4,
      "0"
    );
    boardCode = `TNMM-${randomDigits}`;

    const existing = await prisma.audit.findUnique({
      where: { boardCode },
    });

    exists = !!existing;
  }

  return boardCode;
}

module.exports = {generateBoardCode}
