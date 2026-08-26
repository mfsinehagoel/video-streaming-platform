import { Request, Response } from "express";
import { Video } from "../models";
import { minioClient, MINIO_BUCKET } from "../config/minio";

export async function streamHLS(req: Request, res: Response) {
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

    if (!video.hlsObjectKey) {
      return res.status(404).json({
        success: false,
        message: "HLS stream is not available",
      });
    }

    // Express 5 wildcard parameter
    const splat = req.params.splat;

    const requestedPath = Array.isArray(splat) ? splat.join("/") : splat;

    if (!requestedPath) {
      return res.status(400).json({
        success: false,
        message: "HLS file path is required",
      });
    }

    console.log("HLS video ID:", videoId);
    console.log("HLS requested path:", requestedPath);

    // Example:
    // video.hlsObjectKey = hls/1/18/master.m3u8
    // requestedPath = 720p/playlist.m3u8
    //
    // Result:
    // hls/1/18/720p/playlist.m3u8

    const hlsPrefix = video.hlsObjectKey.replace("/master.m3u8", "");

    const objectKey = `${hlsPrefix}/${requestedPath}`;

    console.log(`Streaming HLS file: ${objectKey}`);

    const object = await minioClient.getObject(MINIO_BUCKET, objectKey);

    if (!object) {
      return res.status(404).json({
        success: false,
        message: "HLS file not found",
      });
    }

    if (objectKey.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

      res.setHeader("Cache-Control", "no-cache");
    } else if (objectKey.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");

      res.setHeader("Cache-Control", "public, max-age=3600");
    }

    object.pipe(res);
  } catch (error) {
    console.error("HLS streaming error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to stream video",
    });
  }
}
