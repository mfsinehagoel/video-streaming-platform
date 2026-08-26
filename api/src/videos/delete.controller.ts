import { Request, Response } from "express";
import { Video, VideoVariant, ProcessingJob } from "../models";
import { minioClient, MINIO_BUCKET } from "../config/minio";

async function deleteObjectIfExists(objectKey: string) {
  try {
    await minioClient.removeObject(MINIO_BUCKET, objectKey);
    console.log(`Deleted MinIO object: ${objectKey}`);
  } catch (error) {
    console.error(`Failed to delete MinIO object: ${objectKey}`, error);
  }
}

export async function deleteVideo(req: Request, res: Response) {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    console.log(`Deleting video ${videoId}`);

    // 1. Delete original video
    if (video.originalObjectKey) {
      await deleteObjectIfExists(video.originalObjectKey);
    }

    // 2. Delete thumbnail
    if (video.thumbnailObjectKey) {
      await deleteObjectIfExists(video.thumbnailObjectKey);
    }

    // 3. Delete processed video variants
    const variants = await VideoVariant.findAll({
      where: {
        videoId,
      },
    });

    for (const variant of variants) {
      await deleteObjectIfExists(variant.objectKey);
    }

    // 4. Delete HLS files
    if (video.hlsObjectKey) {
      const hlsPrefix = video.hlsObjectKey.replace("/master.m3u8", "");

      console.log(`Deleting HLS objects under: ${hlsPrefix}`);

      const objectsToDelete: string[] = [];

      const stream = minioClient.listObjects(
        MINIO_BUCKET,
        hlsPrefix + "/",
        true,
      );

      for await (const object of stream) {
        if (object.name) {
          objectsToDelete.push(object.name);
        }
      }

      for (const objectKey of objectsToDelete) {
        await deleteObjectIfExists(objectKey);
      }
    }

    // 5. Delete VideoVariant records
    await VideoVariant.destroy({
      where: {
        videoId,
      },
    });

    // 6. Delete ProcessingJob records
    await ProcessingJob.destroy({
      where: {
        videoId,
      },
    });

    // 7. Delete video record
    await video.destroy();

    console.log(`Video ${videoId} deleted successfully`);

    return res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Delete video error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete video",
    });
  }
}
