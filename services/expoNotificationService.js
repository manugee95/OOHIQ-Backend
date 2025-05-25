const { Expo } = require("expo-server-sdk");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

const sendNewAuditNotification = async () => {
  try {
    //Step 1. Get all users with Expo push tokens
    const users = await prisma.user.findMany({
      where: {
        role: "FIELD_AUDITOR",
        pushToken: { not: null },
      },
      select: {
        pushToken: true,
      },
    });

    const pushTokens = users.map((user) => user.pushToken);

    //Step 2. Build messages array
    let messages = [];

    for (let token of pushTokens) {
      if (!Expo.isExpoPushToken(token)) {
        console.error(`Push token ${token} is invalid`);
        continue;
      }

      messages.push({
        to: token,
        sound: "default",
        body: "New Audit Upload Available for Evaluation",
        data: { type: "audit_upload" },
      });

      if (messages.length === 0) return;
    }

    //Step 3. Chunk messages for Expo
    let chunks = expo.chunkPushNotifications(messages)
    let tickets = []

    //Step 4. Send notifications in chunks
    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk)
            tickets.push(...ticketChunk)
        } catch (error) {
            console.error(`Failed to send chunk:`, error);
        }
    }
  } catch (error) {}
};
