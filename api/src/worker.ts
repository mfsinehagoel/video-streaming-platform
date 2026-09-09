import {
  initializeRabbitMQ,
  getRabbitMQChannel,
  PROCESSING_QUEUE,
} from "./config/rabbitmq";

import { sequelize } from "./config/database";

import { ProcessingJob, Video, VideoVariant } from "./models";

import {
  downloadFromMinIO,
  uploadToMinIO,
  uploadDirectoryToMinIO,
} from "./services/minio.service";
import { extractVideoMetadata } from "./services/ffprobe.service";
import { generateThumbnail, transcodeVideo } from "./services/ffmpeg.service";

import { mkdir, rm, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { generateHLS } from "./services/hls.service";
import { ConsumeMessage } from "amqplib";

import {
  redisClient,
  invalidateVideoListCache,
  initializeRedis,
} from "./config/redis";

async function startWorker() {
  try {
    // 1. Connect to MySQL
    await sequelize.authenticate();

    // 2. Synchronize database
    await sequelize.sync({ alter: true });

    // 3. Caching through Redis
    await initializeRedis();

    // 4. Connect to RabbitMQ
    await initializeRabbitMQ();

    const channel = getRabbitMQChannel();

    await channel.prefetch(1);

    channel.consume(
      PROCESSING_QUEUE,
      async (message: ConsumeMessage | null) => {
        if (!message) {
          return;
        }

        let jobId: number | undefined;
        let videoId: number | undefined;

        try {
          const job = JSON.parse(message.content.toString());

          jobId = job.jobId;
          videoId = job.videoId;

          if (!jobId || !videoId) {
            throw new Error(
              "Invalid processing job: jobId or videoId is missing",
            );
          }

          await ProcessingJob.update(
            {
              status: "PROCESSING",
              startedAt: new Date(),
              attempts: sequelize.literal("attempts + 1"),
            },
            {
              where: {
                id: jobId,
              },
            },
          );

          // 1. Find video in database
          const video = await Video.findByPk(videoId);

          if (!video) {
            throw new Error(`Video ${videoId} not found`);
          }

          if (!video.originalObjectKey) {
            throw new Error(
              `Video ${videoId} does not have an original object key`,
            );
          }

          // 2. Mark video as PROCESSING
          await Video.update(
            {
              status: "PROCESSING",
            },
            {
              where: {
                id: videoId,
              },
            },
          );

          await redisClient.del(`video:${videoId}`);
          await invalidateVideoListCache();

          // 3. Create temporary file path
          const tempFilePath = path.join(
            "/tmp",
            `video-${videoId}-${Date.now()}.mp4`,
          );

          const thumbnailPath = path.join(
            "/tmp",
            `thumbnail-${videoId}-${Date.now()}.jpg`,
          );

          const output1080Path = path.join(
            "/tmp",
            `video-${videoId}-1080p-${Date.now()}.mp4`,
          );

          const output720Path = path.join(
            "/tmp",
            `video-${videoId}-720p-${Date.now()}.mp4`,
          );

          const output480Path = path.join(
            "/tmp",
            `video-${videoId}-480p-${Date.now()}.mp4`,
          );

          try {
            // 4. Download video from MinIO
            await downloadFromMinIO(video.originalObjectKey, tempFilePath);

            // 5. Run FFprobe
            const metadata = await extractVideoMetadata(tempFilePath);

            // 6. Run FFmpeg
            await generateThumbnail(tempFilePath, thumbnailPath);

            const thumbnailObjectKey = `thumbnails/${video.userId}/${video.id}/thumbnail.jpg`;

            await uploadToMinIO(
              thumbnailObjectKey,
              thumbnailPath,
              "image/jpeg",
            );

            // 7. Transcode video into multiple resolutions
            await transcodeVideo(tempFilePath, output1080Path, 1080);

            await transcodeVideo(tempFilePath, output720Path, 720);

            await transcodeVideo(tempFilePath, output480Path, 480);

            const objectKey1080 = `processed/${video.userId}/${video.id}/1080p.mp4`;

            const objectKey720 = `processed/${video.userId}/${video.id}/720p.mp4`;

            const objectKey480 = `processed/${video.userId}/${video.id}/480p.mp4`;

            await uploadToMinIO(objectKey1080, output1080Path, "video/mp4");

            await uploadToMinIO(objectKey720, output720Path, "video/mp4");

            await uploadToMinIO(objectKey480, output480Path, "video/mp4");

            const stats1080 = await stat(output1080Path);
            const stats720 = await stat(output720Path);
            const stats480 = await stat(output480Path);

            await VideoVariant.bulkCreate([
              {
                videoId,
                resolution: "1080p",
                objectKey: objectKey1080,
                fileSize: stats1080.size,
              },
              {
                videoId,
                resolution: "720p",
                objectKey: objectKey720,
                fileSize: stats720.size,
              },
              {
                videoId,
                resolution: "480p",
                objectKey: objectKey480,
                fileSize: stats480.size,
              },
            ]);

            // HLS playlist
            const hlsDirectory = path.join(
              "/tmp",
              `hls-${videoId}-${Date.now()}`,
            );

            await mkdir(path.join(hlsDirectory, "1080p"), {
              recursive: true,
            });

            await mkdir(path.join(hlsDirectory, "720p"), {
              recursive: true,
            });

            await mkdir(path.join(hlsDirectory, "480p"), {
              recursive: true,
            });

            await generateHLS(
              tempFilePath,
              path.join(hlsDirectory, "1080p"),
              1080,
            );

            await generateHLS(
              tempFilePath,
              path.join(hlsDirectory, "720p"),
              720,
            );

            await generateHLS(
              tempFilePath,
              path.join(hlsDirectory, "480p"),
              480,
            );

            const masterPlaylistPath = path.join(hlsDirectory, "master.m3u8");

            const masterPlaylist = `#EXTM3U
          #EXT-X-VERSION:3

          #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
          1080p/playlist.m3u8

          #EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
          720p/playlist.m3u8

          #EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
          480p/playlist.m3u8
          `;

            await writeFile(masterPlaylistPath, masterPlaylist, "utf8");

            const hlsObjectPrefix = `hls/${video.userId}/${video.id}`;

            await uploadDirectoryToMinIO(hlsDirectory, hlsObjectPrefix);

            const hlsObjectKey = `hls/${video.userId}/${video.id}/master.m3u8`;

            await Video.update(
              {
                hlsObjectKey,
                status: "COMPLETED",
              },
              {
                where: {
                  id: videoId,
                },
              },
            );

            await rm(hlsDirectory, {
              recursive: true,
              force: true,
            });

            // 8. Save metadata to MySQL

            await Video.update(
              {
                fileSize: metadata.fileSize,
                duration: metadata.duration,
                width: metadata.width,
                height: metadata.height,
                codec: metadata.codec,
                thumbnailObjectKey,
                status: "COMPLETED",
              },
              {
                where: {
                  id: videoId,
                },
              },
            );

          } finally {
            const temporaryFiles = [
              tempFilePath,
              thumbnailPath,
              output1080Path,
              output720Path,
              output480Path,
            ];

            for (const file of temporaryFiles) {
              try {
                await unlink(file);
              } catch {}
            }
          }

          // 9. Invalidate Redis cache after processing completes
          await redisClient.del(`video:${videoId}`);
          await invalidateVideoListCache();

          // 10. Mark processing job as completed
          await ProcessingJob.update(
            {
              status: "COMPLETED",
              completedAt: new Date(),
            },
            {
              where: {
                id: jobId,
              },
            },
          );

          // 11. Acknowledge RabbitMQ message
          channel.ack(message);
        } catch (error) {
          channel.nack(message, false, false);
        }
      },
    );
  } catch (error) {
    process.exit(1);
  }
}

startWorker();
