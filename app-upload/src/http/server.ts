import "../../otel.ts";
import { Elysia, t } from "elysia";
import { node } from "@elysiajs/node";
import { swagger } from "@elysiajs/swagger";
import { dispatchUploadCreated } from "../broker/messages/upload-created.ts";
import { opentelemetry } from "@elysiajs/opentelemetry";

import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { db } from "../db/client.ts";
import { uploads } from "../db/schema/uploads.ts";
import { randomUUID } from "node:crypto";

export const app = new Elysia({ adapter: node() })
  .use(
    opentelemetry({
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    })
  )
  .listen(3333, ({ hostname, port }) => {
    console.log(
      "\x1b[32m[Upload]\x1b[0m HTTP server running at %s:%s",
      hostname,
      port
    );
  });

app.use(
  swagger({
    documentation: {
      info: {
        title: "Video Upload API",
        description: "API for uploading videos",
        version: "1.0",
      },
    },
    exclude: ["/health"],
  })
);

app.get("/health", ({ status }) => {
  return status(200, "OK");
});

app.post(
  "/upload",
  async ({ status, body }) => {
    console.log(body);

    const response = {
      message: "Video uploaded",
    };

    await db.insert(uploads).values({
      id: randomUUID(),
      title: body.title,
      description: body.description,
    });

    dispatchUploadCreated({
      title: body.title,
      description: body.description,
    });

    return status(201, { message: "Video uploaded successfully" });
  },
  {
    body: t.Object(
      {
        file: t.File({ format: "video/*", description: "Video file" }),
        title: t.Optional(
          t.String({
            description: "Title of the video",
            examples: "Video Title",
          })
        ),
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
          file: "Video file",
          title: "Video Title",
          tags: ["Video Tag"],
        },
      }
    ),
    type: "multipart/form-data",
    detail: {
      operationId: "uploadVideo",
      summary: "Upload a video",
      description: "Upload a video to the server",
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
            },
          },
        },
      },
      responses: {
        201: {
          description: "Video uploaded successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
    response: {
      201: t.Object(
        {
          message: t.String(),
        },
        {
          examples: {
            "Video uploaded successfully": {
              value: {
                message: "Video uploaded successfully",
                status: 201,
              },
            },
          },
        }
      ),
    },
  }
);
