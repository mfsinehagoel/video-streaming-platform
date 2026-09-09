import { Request, Response } from "express";
import { Video, VideoVariant } from "@video-platform/shared";
import { deleteFromMinIO, deleteDirectoryFromMinIO } from "@video-platform/shared";
import { redisClient, invalidateVideoListCache } from "@video-platform/shared";
import { AppError } from "../errors/AppError";

export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;

    if (!idParam) {
      throw new AppError("Video ID is required", 400);
    }

    const videoId = Number(idParam);

    if (!Number.isInteger(videoId)) {
      throw new AppError("Invalid video ID", 400);
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError("Video not found", 404);
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

    // Delete all HLS files: master playlist, variant playlists and segments
    if (video.hlsObjectKey) {
      const hlsPrefix = video.hlsObjectKey.substring(
        0,
        video.hlsObjectKey.lastIndexOf("/") + 1,
      );

      await deleteDirectoryFromMinIO(hlsPrefix);
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

    await redisClient.del(`video:${videoId}`);
    await invalidateVideoListCache();

    return res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    throw new AppError("Failed to delete video", 500);
  }
};
