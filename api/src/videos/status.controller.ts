import { Request, Response } from "express";
import { ProcessingJob, Video } from "../models";

export async function getVideoStatus(req: Request, res: Response) {
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
    console.error("Get video status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch video status",
    });
  }
}
