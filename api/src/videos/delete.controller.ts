import { Request, Response } from "express";
import { Video, VideoVariant, ProcessingJob } from "../models";
import { minioClient, MINIO_BUCKET } from "../config/minio";
import { deleteFromMinIO } from "../services/minio.service";

async function deleteObjectIfExists(objectKey: string) {
  try {
    await minioClient.removeObject(MINIO_BUCKET, objectKey);
    console.log(`Deleted MinIO object: ${objectKey}`);
  } catch (error) {
    console.error(`Failed to delete MinIO object: ${objectKey}`, error);
  }
}

export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;

    if (!idParam) {
      return res.status(400).json({
        success: false,
        message: "Video ID is required",
      });
    }

    const videoId = Number(idParam);

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

    // Find all processed variants
    const variants = await VideoVariant.findAll({
      where: {
        videoId,
      },
    });

    // Delete original
    if (video.originalObjectKey) {
      await deleteFromMinIO(video.originalObjectKey);
    }

    // Delete thumbnail
    if (video.thumbnailObjectKey) {
      await deleteFromMinIO(video.thumbnailObjectKey);
    }

    // Delete HLS playlist if present
    if (video.hlsObjectKey) {
      await deleteFromMinIO(video.hlsObjectKey);
    }

    // Delete processed variants
    for (const variant of variants) {
      await deleteFromMinIO(variant.objectKey);
    }

    // Delete variant records
    await VideoVariant.destroy({
      where: {
        videoId,
      },
    });

    // Delete video record
    await video.destroy();

    return res.status(200).json({
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
};
