import { Request, Response } from "express";
import { ProcessingJob, Video } from "@video-platform/shared";
import { AppError } from "../errors/AppError";

export async function getVideoStatus(req: Request, res: Response) {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      throw new AppError("Invalid video ID", 400);
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    const processingJob = await ProcessingJob.findOne({
      where: {
        videoId,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,

      video: {
        id: video.id,
        status: video.status,
      },

      processingJob: processingJob
        ? {
            id: processingJob.id,
            status: processingJob.status,
            attempts: processingJob.attempts,
            startedAt: processingJob.startedAt,
            completedAt: processingJob.completedAt,
          }
        : null,
    });
  } catch (error) {
    throw new AppError("Failed to fetch video status", 500);
  }
}
