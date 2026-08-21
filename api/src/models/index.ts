import { User } from "./user.model";
import { Video } from "./video.model";
import { VideoVariant } from "./video-variant.model";
import { ProcessingJob } from "./processing-job.model";

// User → Video
User.hasMany(Video, {
  foreignKey: "userId",
  as: "videos",
});

Video.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Video → VideoVariant
Video.hasMany(VideoVariant, {
  foreignKey: "videoId",
  as: "variants",
});

VideoVariant.belongsTo(Video, {
  foreignKey: "videoId",
  as: "video",
});

// Video → ProcessingJob
Video.hasMany(ProcessingJob, {
  foreignKey: "videoId",
  as: "processingJobs",
});

ProcessingJob.belongsTo(Video, {
  foreignKey: "videoId",
  as: "video",
});

export { User, Video, VideoVariant, ProcessingJob };
