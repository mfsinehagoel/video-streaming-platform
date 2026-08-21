import { minioClient, MINIO_BUCKET } from "./minio";

export async function initializeMinIO() {
  const exists = await minioClient.bucketExists(MINIO_BUCKET);

  if (!exists) {
    await minioClient.makeBucket(MINIO_BUCKET);

    console.log(`MinIO bucket "${MINIO_BUCKET}" created`);
  } else {
    console.log(`MinIO bucket "${MINIO_BUCKET}" already exists`);
  }
}
