import { minioClient, MINIO_BUCKET } from "./minio";

export async function initializeMinIO() {
  const exists = await minioClient.bucketExists(MINIO_BUCKET);

  if (!exists) {
    await minioClient.makeBucket(MINIO_BUCKET);
  } else {}
}
