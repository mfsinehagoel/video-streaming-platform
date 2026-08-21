import multer from "multer";
import fs from "fs";

const uploadDirectory = "/tmp/video-uploads";

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDirectory);
    },

    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;

      cb(null, uniqueName);
    },
  }),

  limits: {
    // 2 GB maximum
    fileSize: 2 * 1024 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});
