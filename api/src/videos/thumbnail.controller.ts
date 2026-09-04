import { Request, Response } from "express";
import { Video } from "../models";
import { minioClient, MINIO_BUCKET } from "../config/minio";

export async function getThumbnail(req: Request, res: Response) {
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

    if (!video.thumbnailObjectKey) {
      return res.status(404).json({
        success: false,
        message: "Thumbnail is not available",
      });
    }

    const object = await minioClient.getObject(
      MINIO_BUCKET,
      video.thumbnailObjectKey,
    );

    res.setHeader("Content-Type", "image/jpeg");

    res.setHeader("Cache-Control", "public, max-age=3600");

    object.pipe(res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve thumbnail",
    });
  }
}
