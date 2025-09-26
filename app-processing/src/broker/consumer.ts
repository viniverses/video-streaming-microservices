import { randomUUID } from "node:crypto";
import { channels } from "./channels/index.ts";
import { EVENTS } from "./events.ts";
import { UploadFinished } from "../../../contracts/messages/upload-finished.ts";
import { processing } from "../db/schema/processing.ts";

import { db } from "../db/client.ts";
import { eq } from "drizzle-orm";
import {
  getVideoMetadata,
  generateThumbnailToStream,
  transcodeToMp4Stream,
} from "../lib/ffmpeg.ts";
import { createS3UploadStream } from "../lib/s3.ts";

const processUploadFinished = async (data: UploadFinished): Promise<void> => {
  const { videoId, path } = data;
  const resolutions = ["1080", "720", "480"];

  try {
    const metadata = await getVideoMetadata(path);
    const videoDuration = metadata?.format?.duration
      ? Math.floor(metadata.format.duration)
      : null;

    console.log("videoDuration", videoDuration);

    await db.insert(processing).values({
      id: randomUUID(),
      videoId: data.videoId,
      duration: videoDuration ?? null,
    });

    const thumbKey = `videos/${videoId}/thumbnail.jpg`;
    console.log("Gerando thumbnail:", thumbKey);
    const { pass: thumbPass, uploadPromise: thumbUploadPromise } =
      createS3UploadStream(thumbKey, "image/jpg");

    await generateThumbnailToStream(path, thumbPass);
    await thumbUploadPromise;

    for (const resolution of resolutions) {
      const videoKey = `videos/${videoId}/${videoId}-${resolution}p.mp4`;
      console.log(`Processando resolução ${resolution}p:`, videoKey);

      const { pass: videoPass, uploadPromise: videoUploadPromise } =
        createS3UploadStream(videoKey, "video/mp4");

      await transcodeToMp4Stream(path, resolution, videoPass);
      await videoUploadPromise;
      console.log(
        `Vídeo ${resolution}p processado e enviado para S3 com sucesso`
      );
    }

    console.log("processUploadFinished finished");
  } catch (error) {
    console.error("processUploadFinished", error);
    throw error;
  }
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
        break;
    }
  } catch (error) {
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
      } catch (error) {
        channels.uploads.nack(message, false, false);
      }
    }
  },
  {
    noAck: false,
  }
);
