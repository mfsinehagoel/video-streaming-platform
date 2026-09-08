import { Request, Response } from "express";
import { Video } from "@video-platform/shared";
import { minioClient, MINIO_BUCKET } from "../config/minio";
import { AppError } from "../errors/AppError";

export async function streamHLS(req: Request, res: Response) {
  try {
    const videoId = Number(req.params.id);

    if (!Number.isInteger(videoId)) {
      throw new AppError("Invalid video ID", 400);
    }

    const video = await Video.findByPk(videoId);

    if (!video) {
      throw new AppError("Video not found", 404);
    }

    if (!video.hlsObjectKey) {
      throw new AppError("HLS stream is not available", 404);
    }

    // Express 5 wildcard parameter
    const splat = req.params.splat;

    const requestedPath = Array.isArray(splat) ? splat.join("/") : splat;

    if (!requestedPath) {
      throw new AppError("HLS file path is required", 404);
    }

    // Example:
    // video.hlsObjectKey = hls/1/18/master.m3u8
    // requestedPath = 720p/playlist.m3u8
    //
    // Result:
    // hls/1/18/720p/playlist.m3u8

    const hlsPrefix = video.hlsObjectKey.replace("/master.m3u8", "");

    const objectKey = `${hlsPrefix}/${requestedPath}`;

    const object = await minioClient.getObject(MINIO_BUCKET, objectKey);

    if (!object) {
      throw new AppError("HLS file not found", 404);
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
    throw new AppError("Failed to stream video", 500);
  }
}
