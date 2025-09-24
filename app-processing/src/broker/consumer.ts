import { randomUUID } from "node:crypto";
import { channels } from "./channels/index.ts";
import { EVENTS } from "./events.ts";
import { UploadFinished } from "../../../contracts/messages/upload-finished.ts";
import { processing } from "../db/schema/processing.ts";
import { db } from "../db/client.ts";

const processUploadFinished = async (data: UploadFinished): Promise<void> => {
  console.log(`🏁 Processando finalização de upload:`, data);

  await db.insert(processing).values({
    id: randomUUID(),
    videoId: data.videoId,
  });
};

const processMessage = async (
  message: any,
  routingKey: string
): Promise<void> => {
  try {
    const data = JSON.parse(message.content.toString());

    switch (routingKey) {
      case EVENTS.UPLOAD_CREATED:
        break;
      case EVENTS.UPLOAD_FINISHED:
        await processUploadFinished(data);
        break;
      default:
        console.log(` ⚠️ Evento desconhecido: ${routingKey}`);
    }
  } catch (error) {
    console.error(`❌ Erro no processamento:`, error);
    throw error;
  }
};

channels.uploads.consume(
  "uploads",
  async (message) => {
    if (message?.content) {
      const routingKey = message.fields.routingKey;

      try {
        await processMessage(message, routingKey);

        channels.uploads.ack(message);
        console.log(
          `✅ Mensagem processada e confirmada - Routing Key: ${routingKey}`
        );
      } catch (error) {
        console.error(
          `❌ Erro ao processar mensagem - Routing Key: ${routingKey}:`,
          error
        );
        // Rejeita a mensagem em caso de erro
        channels.uploads.nack(message, false, false);
      }
    }
  },
  {
    noAck: false,
  }
);
