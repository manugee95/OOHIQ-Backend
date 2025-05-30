async function generateBoardCode(prisma, id) {
  let boardCode;
  let exists = true;

  //Get state from the audit record
  const audit = await prisma.audit.findUnique({
    where: { id: parseInt(id) },
    select: { state: true },
  });

  if (!audit || !audit.state) {
    throw new Error("Audit not found or state missing");
  }

  const statePrefix = audit.state.slice(0, 3).toUpperCase();

  while (exists) {
    const randomDigits = String(Math.floor(Math.random() * 10000)).padStart(
      4,
      "0"
    );
    boardCode = `${statePrefix}-${randomDigits}`;

    const existing = await prisma.audit.findUnique({
      where: { boardCode },
    });

    exists = !!existing;
  }

  return boardCode;
}

module.exports = { generateBoardCode };
