import { Video } from "../models/video.model";

import fs from "fs";
import path from "path";
import { minioClient, MINIO_BUCKET } from "../config/minio";
import { extractVideoMetadata } from "./video-metadata.service";
import { TEMP_DIR } from "../config/temp";

import { Op } from "sequelize";

export class VideosService {
  async createVideo(data: {
    userId: number;
    title: string;
    originalFilename: string;
    fileSize: number;
  }) {
    return Video.create({
      userId: data.userId,
      title: data.title,
      originalFilename: data.originalFilename,
      fileSize: data.fileSize,
      status: "UPLOADING",
      duration: null,
      width: null,
      height: null,
      codec: null,
      originalObjectKey: null,
    });
  }

  async getVideos(options?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { search, page = 1, limit = 10 } = options || {};

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {
    ...(search
      ? {
          [Op.or]: [
            {
              title: {
                [Op.like]: `%${search}%`,
              },
            },
            {
              originalFilename: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        }
      : {}),

    // Only return completed videos
    status: "COMPLETED",
  };

  const { count, rows } = await Video.findAndCountAll({
    where,
    limit: safeLimit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return {
    videos: rows,

    pagination: {
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    },
  };
}

  async getVideoById(id: number) {
    return Video.findByPk(id);
  }
}

export async function processVideoMetadata(videoId: number, objectKey: string) {
  const tempFilePath = path.join(
    TEMP_DIR,
    `${videoId}-${path.basename(objectKey)}`,
  );

  try {
    // Download video from MinIO
    await minioClient.fGetObject(MINIO_BUCKET, objectKey, tempFilePath);

    // Extract metadata using FFprobe
    const metadata = await extractVideoMetadata(tempFilePath);

    // Update database
    await Video.update(
      {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        codec: metadata.codec,
        status: "COMPLETED",
      },
      {
        where: {
          id: videoId,
        },
      },
    );

    return metadata;
  } catch (error) {

    await Video.update(
      {
        status: "FAILED",
      },
      {
        where: {
          id: videoId,
        },
      },
    );

    throw error;
  } finally {
    // Delete temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
