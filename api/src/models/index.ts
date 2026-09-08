import { User } from "./user.model";
import { Video } from "@video-platform/shared";

// User → Video
User.hasMany(Video, {
  foreignKey: "userId",
  as: "videos",
});

Video.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

export { User };
