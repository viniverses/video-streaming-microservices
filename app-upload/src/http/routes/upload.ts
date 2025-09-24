import { Elysia, t } from "elysia";
import { db } from "../../db/client.ts";
import { videos } from "../../db/schema/videos.ts";
import { randomUUID } from "node:crypto";
import {
  dispatchUploadCreated,
  dispatchUploadFinished,
} from "../../broker/messages/upload-created.ts";
import {
  getPresignedUploadUrl,
  objectExists,
  getPublicUrlForKey,
} from "../../lib/s3.ts";
import { eq } from "drizzle-orm";

export function uploadRoutes(app: Elysia) {
  return app.group("/upload", (app) =>
    app
      .post(
        "/request",
        async ({ status, body }) => {
          const videoId = randomUUID();
          const key = `videos/${videoId}.mp4`;

          try {
            await db.insert(videos).values({
              id: videoId,
              title: body.title,
              tags: body.tags?.join("|") || null,
              description: body.description || null,
              status: "pending",
              path: null,
            });
          } catch (error) {
            console.error(error);
            return status(500, {
              message: "Erro ao inserir o vídeo no banco de dados",
            });
          }

          const presignedUploadUrl = await getPresignedUploadUrl(
            key,
            "video/mp4"
          );

          dispatchUploadCreated({
            title: body.title,
            description: body.description,
          });

          return status(201, {
            videoId: videoId,
            presignedUploadUrl,
          });
        },
        {
          body: t.Object(
            {
              title: t.String({
                description: "Title of the video",
                examples: "Video Title",
              }),
              description: t.Optional(
                t.String({
                  description: "Description of the video",
                  examples: "Video Description",
                })
              ),
              tags: t.Optional(
                t.Array(t.String({ description: "Tags of the video" }))
              ),
            },
            {
              example: {
                title: "Video Title",
                description: "Video Description",
                tags: ["Tag 1", "Tag 2", "Tag 3"],
              },
            }
          ),
          type: "application/json",
          detail: {
            operationId: "requestUpload",
            summary: "Request to upload a video",
            description: "Request to upload a video to the server",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            responses: {
              201: {
                description: "Upload requested successfully",
                content: {
                  "application/json": {
                    examples: {
                      "Upload requested successfully": {
                        value: {
                          videoId: "d4602423-2b3f-4cf4-87e1-9f43487592e7",
                          presignedUploadUrl: "https://example.com",
                        },
                      },
                    },
                    schema: {
                      type: "object",
                      properties: {
                        videoId: {
                          type: "string",
                        },
                        presignedUploadUrl: {
                          type: "string",
                        },
                      },
                    },
                  },
                },
              },
              500: {
                description: "Erro ao inserir o vídeo no banco de dados",
              },
            },
          },
          response: {
            201: t.Object(
              {
                videoId: t.String(),
                presignedUploadUrl: t.String(),
              },
              {
                examples: {
                  "Video uploaded successfully": {
                    value: {
                      videoId: "123",
                      presignedUploadUrl: "https://example.com",
                      status: 201,
                    },
                  },
                },
              }
            ),
            500: t.Object({
              message: t.String(),
            }),
          },
        }
      )
      .post(
        "/confirm",
        async ({ status, body }) => {
          const { videoId } = body;
          const key = `videos/${videoId}.mp4`;

          /*
          const existing = await db
            .select({ id: videos.id, status: videos.status, path: videos.path })
            .from(videos)
            .where(eq(videos.id, videoId))
            .limit(1);

          if (existing.length === 0) {
            return status(404, { message: "Vídeo não encontrado" });
          }

          if (existing[0].status !== "pending") {
            return status(409, { message: "Upload já confirmado" });
          }
          */

          const exists = await objectExists(key);
          if (!exists) {
            return status(404, {
              message: "Arquivo não encontrado no storage",
            });
          }

          const updated = await db
            .update(videos)
            .set({
              path: key,
              status: "uploaded",
              updatedAt: new Date(),
            })
            .where(eq(videos.id, videoId))
            .returning({ id: videos.id });

          if (updated.length === 0) {
            return status(404, { message: "Vídeo não encontrado" });
          }

          const publicUrl = getPublicUrlForKey(key);

          dispatchUploadFinished({
            videoId,
            path: publicUrl,
          });

          return status(200, {
            videoId,
            status: "uploaded",
            path: publicUrl,
          });
        },
        {
          body: t.Object(
            {
              videoId: t.String({
                description: "ID do vídeo gerado no request de upload",
              }),
            },
            {
              example: {
                videoId: "d4602423-2b3f-4cf4-87e1-9f43487592e7",
              },
            }
          ),
          type: "application/json",
          detail: {
            operationId: "confirmUpload",
            summary: "Confirma o upload do vídeo",
            description:
              "Confirma que o arquivo foi enviado ao S3, atualiza o status e salva o caminho.",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Upload confirmado",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        videoId: { type: "string" },
                        path: { type: "string" },
                        status: { type: "string" },
                      },
                    },
                  },
                },
              },
              404: {
                description: "Arquivo ou vídeo não encontrado",
              },
              409: {
                description: "Upload já confirmado",
              },
            },
          },
          response: {
            200: t.Object({
              videoId: t.String(),
              path: t.String(),
              status: t.String(),
            }),
            404: t.Object({
              message: t.String(),
            }),
            409: t.Object({
              message: t.String(),
            }),
          },
        }
      )
  );
}
