import { Request, Response } from "express";
import { Op } from "sequelize";

import { ProcessingJob, Video, VideoVariant } from "../models";
import { getRabbitMQChannel, PROCESSING_QUEUE } from "../config/rabbitmq";

// GET /api/admin/dashboard
export async function getDashboard(req: Request, res: Response) {
  try {
    const [
      totalVideos,
      queuedVideos,
      processingVideos,
      completedVideos,
      failedVideos,

      queuedJobs,
      processingJobs,
      failedJobs,

      totalStorage,
      completedJobs,

      totalViews,
      totalDownloads,
    ] = await Promise.all([
      // Videos
      Video.count(),

      Video.count({
        where: {
          status: "QUEUED",
        },
      }),

      Video.count({
        where: {
          status: "PROCESSING",
        },
      }),

      Video.count({
        where: {
          status: "COMPLETED",
        },
      }),

      Video.count({
        where: {
          status: "FAILED",
        },
      }),

      // Jobs
      ProcessingJob.count({
        where: {
          status: "QUEUED",
        },
      }),

      ProcessingJob.count({
        where: {
          status: "PROCESSING",
        },
      }),

      ProcessingJob.count({
        where: {
          status: "FAILED",
        },
      }),

      // Storage
      Video.sum("fileSize"),

      // Completed jobs
      ProcessingJob.findAll({
        where: {
          status: "COMPLETED",
          startedAt: {
            [Op.ne]: null,
          },
          completedAt: {
            [Op.ne]: null,
          },
        },

        attributes: ["id", "startedAt", "completedAt"],

        order: [["completedAt", "DESC"]],
      }),

      // Statistics
      Video.sum("views"),
      Video.sum("downloads"),
    ]);

    // Average processing time
    let averageProcessingTime = 0;

    if (completedJobs.length > 0) {
      const durations = completedJobs
        .filter((job) => job.startedAt && job.completedAt)
        .map((job) => job.completedAt!.getTime() - job.startedAt!.getTime());

      if (durations.length > 0) {
        averageProcessingTime =
          durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length;
      }
    }

    return res.json({
      success: true,

      data: {
        videos: {
          total: totalVideos,

          storageUsage: totalStorage || 0,

          uploads: totalVideos,

          queued: queuedVideos,

          processing: processingVideos,

          completed: completedVideos,

          failed: failedVideos,
        },

        jobs: {
          active: processingJobs,

          queued: queuedJobs,

          failed: failedJobs,
        },

        averageProcessingTime,

        statistics: {
          views: totalViews || 0,
          downloads: totalDownloads || 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard",
    });
  }
}

// GET /api/admin/videos
export async function getAdminVideos(req: Request, res: Response) {
  try {
    const { status, resolution, dateFrom, dateTo, minDuration, maxDuration } =
      req.query;

    // Build video filters
    const where: any = {};

    // Status
    if (status && typeof status === "string") {
      where.status = status;
    }

    // Date range
    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom && typeof dateFrom === "string") {
        where.createdAt[Op.gte] = new Date(`${dateFrom}T00:00:00`);
      }

      if (dateTo && typeof dateTo === "string") {
        where.createdAt[Op.lte] = new Date(`${dateTo}T23:59:59.999`);
      }
    }

    // Duration
    if (minDuration || maxDuration) {
      where.duration = {};

      if (minDuration) {
        where.duration[Op.gte] = Number(minDuration);
      }

      if (maxDuration) {
        where.duration[Op.lte] = Number(maxDuration);
      }
    }

    // Fetch videos
    const videos = await Video.findAll({
      where,

      include: [
        {
          model: VideoVariant,
          as: "variants",
          required: false,

          attributes: ["id", "resolution", "fileSize"],
        },

        {
          model: ProcessingJob,
          as: "processingJobs",
          required: false,

          attributes: [
            "id",
            "status",
            "attempts",
            "errorMessage",
            "startedAt",
            "completedAt",
          ],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    // Resolution filter
    let result = videos;

    if (resolution && typeof resolution === "string") {
      result = videos.filter((video: any) => {
        const variants = video.variants || [];

        return variants.some(
          (variant: any) => variant.resolution === resolution,
        );
      });
    }

    // Response
    const data = result.map((video: any) => {
      const variants = video.variants || [];

      const processingJobs = video.processingJobs || [];

      const processingJob =
        processingJobs.length > 0
          ? processingJobs[processingJobs.length - 1]
          : null;

      return {
        id: video.id,

        title: video.title,

        originalFilename: video.originalFilename,

        status: video.status,

        resolution: video.height ? `${video.height}p` : null,

        duration: video.duration,

        fileSize: video.fileSize,

        createdAt: video.createdAt,

        views: video.views ?? 0,

        downloads: video.downloads ?? 0,

        processingJob: processingJob
          ? {
              id: processingJob.id,

              status: processingJob.status,

              attempts: processingJob.attempts,

              errorMessage: processingJob.errorMessage,

              startedAt: processingJob.startedAt,

              completedAt: processingJob.completedAt,
            }
          : null,

        variants,
      };
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin videos",
    });
  }
}

// GET /api/admin/jobs
export async function getAdminJobs(req: Request, res: Response) {
  try {
    const { status } = req.query;

    const where: any = {};

    if (status && typeof status === "string") {
      where.status = status;
    }

    const jobs = await ProcessingJob.findAll({
      where,

      order: [["createdAt", "DESC"]],

      limit: 100,
    });

    return res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin jobs",
    });
  }
}

// POST /api/admin/jobs/:id/retry
export async function retryJob(req: Request, res: Response) {
  try {
    const jobId = Number(req.params.id);

    if (!Number.isInteger(jobId) || jobId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID",
      });
    }

    // Find job
    const job = await ProcessingJob.findByPk(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Processing job not found",
      });
    }

    // Only FAILED jobs can be manually retried
    if (job.status !== "FAILED") {
      return res.status(400).json({
        success: false,
        message: "Only failed jobs can be retried",
      });
    }

    // Find video
    const video = await Video.findByPk(job.videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video associated with job not found",
      });
    }

    // Update job
    await job.update({
      status: "QUEUED",

      errorMessage: null,

      startedAt: null,

      completedAt: null,
    });

    // Update video
    await video.update({
      status: "QUEUED",
    });

    // Publish RabbitMQ message
    const channel = getRabbitMQChannel();

    channel.sendToQueue(
      PROCESSING_QUEUE,

      Buffer.from(
        JSON.stringify({
          jobId: job.id,
          videoId: job.videoId,
        }),
      ),

      {
        persistent: true,
      },
    );

    return res.json({
      success: true,

      message: "Processing job queued for retry",

      data: {
        jobId: job.id,

        videoId: job.videoId,

        status: "QUEUED",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retry processing job",
    });
  }
}
