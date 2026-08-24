import {
  initializeRabbitMQ,
  getRabbitMQChannel,
  PROCESSING_QUEUE,
} from "./config/rabbitmq";

import { sequelize } from "./config/database";

import { ProcessingJob, Video, VideoVariant } from "./models";

import { downloadFromMinIO, uploadToMinIO } from "./services/minio.service";
import { extractVideoMetadata } from "./services/ffprobe.service";
import { generateThumbnail, transcodeVideo } from "./services/ffmpeg.service";

import { unlink } from "fs/promises";
import path from "path";

async function startWorker() {
  try {
    await sequelize.authenticate();

    console.log("Worker: MySQL connected successfully");

    await sequelize.sync({ alter: true });

    console.log("Worker: Database synchronized successfully");

    await initializeRabbitMQ();

    const channel = getRabbitMQChannel();

    await channel.prefetch(1);

    console.log(`Worker listening on "${PROCESSING_QUEUE}"`);

    channel.consume(PROCESSING_QUEUE, async (message) => {
      if (!message) {
        return;
      }

      let jobId: number | undefined;
      let videoId: number | undefined;

      try {
        const job = JSON.parse(message.content.toString());

        console.log("Received processing job:", job);

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

        console.log(`Processing video ${videoId}, job ${jobId}`);

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

          console.log(
            `Downloading video from MinIO: ${video.originalObjectKey}`,
          );

          await downloadFromMinIO(video.originalObjectKey, tempFilePath);

          console.log(`Video ${videoId} downloaded successfully`);

          // 5. Run FFprobe

          console.log(`Running FFprobe for video ${videoId}`);

          const metadata = await extractVideoMetadata(tempFilePath);

          console.log("Video metadata extracted:", metadata);

          // 6. Run FFmpeg

          console.log(`Generating thumbnail for video ${videoId}`);

          await generateThumbnail(tempFilePath, thumbnailPath);

          console.log(`Thumbnail generated: ${thumbnailPath}`);

          const thumbnailObjectKey = `thumbnails/${video.userId}/${video.id}/thumbnail.jpg`;

          console.log(`Uploading thumbnail to MinIO: ${thumbnailObjectKey}`);

          await uploadToMinIO(thumbnailObjectKey, thumbnailPath, "image/jpeg");

          console.log("Thumbnail uploaded successfully");

          // 7. Transcode video into multiple resolutions

          console.log(`Starting 1080p transcoding for video ${videoId}`);

          await transcodeVideo(tempFilePath, output1080Path, 1080);

          console.log(`1080p transcoding completed`);

          console.log(`Starting 720p transcoding for video ${videoId}`);

          await transcodeVideo(tempFilePath, output720Path, 720);

          console.log(`720p transcoding completed`);

          console.log(`Starting 480p transcoding for video ${videoId}`);

          await transcodeVideo(tempFilePath, output480Path, 480);

          console.log(`480p transcoding completed`);

          const objectKey1080 = `processed/${video.userId}/${video.id}/1080p.mp4`;

          const objectKey720 = `processed/${video.userId}/${video.id}/720p.mp4`;

          const objectKey480 = `processed/${video.userId}/${video.id}/480p.mp4`;

          console.log("Uploading 1080p video to MinIO");

          await uploadToMinIO(objectKey1080, output1080Path, "video/mp4");

          console.log("Uploading 720p video to MinIO");

          await uploadToMinIO(objectKey720, output720Path, "video/mp4");

          console.log("Uploading 480p video to MinIO");

          await uploadToMinIO(objectKey480, output480Path, "video/mp4");

          console.log("All transcoded videos uploaded successfully");

          // 8. Save metadata to MySQL

          await VideoVariant.bulkCreate([
            {
              videoId,
              resolution: "1080p",
              objectKey: objectKey1080,
              fileSize: null,
            },
            {
              videoId,
              resolution: "720p",
              objectKey: objectKey720,
              fileSize: null,
            },
            {
              videoId,
              resolution: "480p",
              objectKey: objectKey480,
              fileSize: null,
            },
          ]);

          console.log(`Video ${videoId} variants saved successfully`);

          await Video.update(
            {
              fileSize: metadata.fileSize,
              duration: metadata.duration,
              width: metadata.width,
              height: metadata.height,
              codec: metadata.codec,
              thumbnailObjectKey,
              status: "PROCESSING",
            },
            {
              where: {
                id: videoId,
              },
            },
          );

          console.log(`Video ${videoId} metadata updated successfully`);
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

              console.log(`Temporary file deleted: ${file}`);
            } catch {
              console.log(`Temporary file did not need deletion: ${file}`);
            }
          }
        }

        // 9. Mark video update as completed
        await Video.update(
          {
            status: "COMPLETED",
          },
          {
            where: {
              id: videoId,
            },
          },
        );

        // 9. Mark processing job as completed

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

        console.log(`Job ${jobId} completed`);

        // 10. Acknowledge RabbitMQ message

        channel.ack(message);
      } catch (error) {
        console.error(`Worker processing failed for job ${jobId}:`, error);

        // Do not acknowledge the failed message.
        // For now, send it to RabbitMQ's dead-letter path
        // / discard it according to the current queue setup.
        channel.nack(message, false, false);
      }
    });
  } catch (error) {
    console.error("Worker startup failed:", error);
    process.exit(1);
  }
}

startWorker();
