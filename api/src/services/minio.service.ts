import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { createWriteStream, createReadStream } from "fs";
import { mkdir, readdir, stat } from "fs/promises";
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

async function getFilesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getFilesRecursively(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function uploadDirectoryToMinIO(
  localDirectory: string,
  objectPrefix: string,
): Promise<void> {
  const files = await getFilesRecursively(localDirectory);

  for (const file of files) {
    const relativePath = path
      .relative(localDirectory, file)
      .split(path.sep)
      .join("/");

    const objectKey = `${objectPrefix}/${relativePath}`;

    let contentType = "application/octet-stream";

    if (file.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
    } else if (file.endsWith(".ts")) {
      contentType = "video/mp2t";
    }

    const fileStats = await stat(file);

    console.log(`Uploading HLS file: ${objectKey}`);

    await minioClient.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: createReadStream(file),
        ContentLength: fileStats.size,
        ContentType: contentType,
      }),
    );
  }
}
