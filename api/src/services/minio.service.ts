import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { createWriteStream, createReadStream } from "fs";
import { mkdir } from "fs/promises";
import { pipeline } from "stream/promises";
import path from "path";

const minioClient = new S3Client({
  endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const bucket = process.env.MINIO_BUCKET || "videos";

export async function downloadFromMinIO(
  objectKey: string,
  destinationPath: string,
): Promise<void> {
  await mkdir(path.dirname(destinationPath), {
    recursive: true,
  });

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey,
  });

  const response = await minioClient.send(command);

  if (!response.Body) {
    throw new Error("MinIO returned an empty response");
  }

  await pipeline(
    response.Body as NodeJS.ReadableStream,
    createWriteStream(destinationPath),
  );
}

export async function uploadToMinIO(
  objectKey: string,
  filePath: string,
  contentType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: createReadStream(filePath),
    ContentType: contentType,
  });

  await minioClient.send(command);
}
