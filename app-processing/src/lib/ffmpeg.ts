import ffmpeg from "fluent-ffmpeg";
import type { FfprobeData } from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath, { path } from "ffprobe-static";
import type { Writable } from "node:stream";

function resolveBinaryPath(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value as string;
  if (typeof value === "object") {
    const candidate = (value as any).path ?? (value as any).default;
    if (typeof candidate === "string") return candidate as string;
  }
  return null;
}

export function ensureFfmpegConfigured(): void {
  const ffmpegBinaryPath = resolveBinaryPath(ffmpegPath);
  const ffprobeBinary = resolveBinaryPath(ffprobePath) ?? ffmpegBinaryPath;

  if (!ffmpegBinaryPath || typeof ffmpegBinaryPath !== "string") {
    throw new Error("FFmpeg path inválido");
  }

  if (!ffprobeBinary || typeof ffprobeBinary !== "string") {
    throw new Error("FFprobe path inválido");
  }

  ffmpeg.setFfmpegPath(ffmpegBinaryPath);
  ffmpeg.setFfprobePath(ffprobeBinary);
}

export async function getVideoMetadata(
  videoPath: string
): Promise<FfprobeData> {
  ensureFfmpegConfigured();

  return new Promise((resolve, reject) => {
    try {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(metadata);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateThumbnailToStream(
  sourcePath: string,
  writable: Writable
): Promise<void> {
  ensureFfmpegConfigured();
  console.log("Iniciando geração de thumbnail para:", sourcePath);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .seekInput(0.25)
      .frames(1)
      .format("mjpeg")
      .outputOptions(["-vf", "scale=500:-2", "-q:v", "2"])
      .on("end", () => {
        writable.end();
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("Erro ao gerar thumbnail:", err);
        console.error("stdout:", stdout);
        console.error("stderr:", stderr);
        writable.destroy(err);
        reject(err);
      })
      .pipe(writable, { end: false });

    writable.on("error", (err) => {
      console.error("Erro no stream de escrita da thumbnail:", err);
      reject(err);
    });
  });
}

export async function transcodeToMp4Stream(
  sourcePath: string,
  height: string,
  writable: Writable
): Promise<void> {
  ensureFfmpegConfigured();
  console.log(`Iniciando transcodificação para ${height}p:`, sourcePath);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .videoCodec("libx264")
      .size(`?x${height}`)
      .format("mp4")
      .outputOptions("-movflags frag_keyframe+empty_moov")
      .on("end", () => {
        writable.end();
        resolve();
      })
      .on("progress", (progress) => {
        console.log(
          `Progresso da transcodificação ${height}p:`,
          progress.percent + "%"
        );
      })
      .on("error", (err, stdout, stderr) => {
        console.error(`Erro na transcodificação ${height}p:`, err);
        console.error("stdout:", stdout);
        console.error("stderr:", stderr);
        writable.destroy(err);
        reject(err);
      })
      .writeToStream(writable, { end: false });

    writable.on("error", (err) => {
      console.error(`Erro no stream de escrita do vídeo ${height}p:`, err);
      reject(err);
    });
  });
}
