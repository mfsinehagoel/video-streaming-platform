import { Request, Response } from "express";
import { VideosService } from "./videos.service";

const videosService = new VideosService();

export async function createVideo(req: Request, res: Response) {
  try {
    const { userId, title, originalFilename, fileSize } = req.body;

    if (!userId || !title || !originalFilename || !fileSize) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const video = await videosService.createVideo({
      userId,
      title,
      originalFilename,
      fileSize,
    });

    return res.status(201).json({
      success: true,
      video,
    });
  } catch (error) {
    console.error("Create video error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create video",
    });
  }
}

export async function getVideos(req: Request, res: Response) {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const page =
      typeof req.query.page === "string" ? Number(req.query.page) : 1;

    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : 10;

    // Validate page
    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    // Validate limit
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    const result = await videosService.getVideos({
      ...(search !== undefined && { search }),
      ...(status !== undefined && { status }),
      page,
      limit,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get videos error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
}

export async function getVideoById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    const video = await videosService.getVideoById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    return res.json({
      success: true,
      video,
    });
  } catch (error) {
    console.error("Get video error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch video",
    });
  }
}
