import { Request, Response } from "express";
import { Video } from "../models";
import { minioClient, MINIO_BUCKET } from "../config/minio";

export async function downloadOriginalVideo(req: Request, res: Response) {
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

    if (!video.originalObjectKey) {
      return res.status(404).json({
        success: false,
        message: "Original video is not available",
      });
    }

    // Increment download count
    await Video.increment("downloads", {
      where: {
        id: videoId,
      },
    });

    const object = await minioClient.getObject(
      MINIO_BUCKET,
      video.originalObjectKey,
    );

    if (!object) {
      return res.status(404).json({
        success: false,
        message: "Original video file not found",
      });
    }

    res.setHeader("Content-Type", "video/mp4");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(video.originalFilename)}"`,
    );

    res.setHeader("Cache-Control", "no-cache");

    object.pipe(res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to download video",
    });
  }
}
