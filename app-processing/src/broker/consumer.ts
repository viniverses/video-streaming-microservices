import { randomUUID } from "node:crypto";
import { channels } from "./channels/index.ts";
import { EVENTS } from "./events.ts";
import { UploadFinished } from "../../../contracts/messages/upload-finished.ts";
import { processing } from "../db/schema/processing.ts";

import { db } from "../db/client.ts";
import { eq } from "drizzle-orm";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { createS3UploadStream } from "../lib/s3.ts";

const getVideoDuration = async (videoPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const ffmpegBinaryPath = ffmpegPath as unknown as string;

      let ffprobeBinaryPath = ffprobePath as unknown as string;
      if (typeof ffprobePath === "string") {
        ffprobeBinaryPath = ffprobePath;
      } else if (ffprobePath && (ffprobePath as any).path) {
        ffprobeBinaryPath = (ffprobePath as any).path;
      } else if (ffprobePath && (ffprobePath as any).default) {
        ffprobeBinaryPath = (ffprobePath as any).default;
      } else {
        ffprobeBinaryPath = ffmpegBinaryPath;
      }

      if (!ffmpegBinaryPath || typeof ffmpegBinaryPath !== "string") {
        throw new Error("FFmpeg path inválido");
      }

      if (!ffprobeBinaryPath || typeof ffprobeBinaryPath !== "string") {
        throw new Error("FFprobe path inválido");
      }

      ffmpeg.setFfmpegPath(ffmpegBinaryPath);
      ffmpeg.setFfprobePath(ffprobeBinaryPath);

      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format?.duration;
        console.log("metadata", metadata);
        if (duration) {
          const durationInSeconds = Math.floor(duration);
          resolve(durationInSeconds);
        } else {
          reject(new Error("Duração não encontrada nos metadados"));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

const processUploadFinished = async (data: UploadFinished): Promise<void> => {
  const { videoId, path } = data;
  const resolutions = ["1080", "720", "480"];

  try {
    const videoDuration = await getVideoDuration(path);
    console.log("videoDuration", videoDuration);

    await db.insert(processing).values({
      id: randomUUID(),
      videoId: data.videoId,
      duration: videoDuration,
    });

    const thumbKey = `videos/${videoId}/thumbnail.jpg`;
    const { pass: thumbPass, uploadPromise: thumbUploadPromise } =
      createS3UploadStream(thumbKey, "image/jpg");

    await new Promise<void>((resolve, reject) => {
      ffmpeg(path)
        .setFfmpegPath(ffmpegPath as unknown as string)
        .seekInput(0.25)
        .frames(1)
        .format("mjpeg")
        .outputOptions(["-vf", "scale=500:-2", "-q:v", "2"])
        .on("end", () => {
          thumbPass.end();
        })
        .on("error", (err, stdout, stderr) => {
          thumbPass.destroy(err);
          reject(err);
        })
        .pipe(thumbPass, { end: false });

      thumbUploadPromise.then(() => resolve()).catch(reject);
    });

    for (const resolution of resolutions) {
      const videoKey = `videos/${videoId}/${videoId}-${resolution}p.mp4`;
      const { pass: videoPass, uploadPromise: videoUploadPromise } =
        createS3UploadStream(videoKey, "video/mp4");

      await new Promise<void>((resolve, reject) => {
        ffmpeg(path)
          .setFfmpegPath(ffmpegPath as unknown as string)
          .videoCodec("libx264")
          .size(`?x${resolution}`)
          .format("mp4")
          .outputOptions("-movflags frag_keyframe+empty_moov")
          .on("end", () => {
            videoPass.end();
          })
          .on("error", (err, stdout, stderr) => {
            videoPass.destroy(err);
            reject(err);
          })
          .writeToStream(videoPass, { end: false });

        videoPass.on("error", (err) => {
          reject(err);
        });

        videoUploadPromise.then(() => resolve()).catch(reject);
      });
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
