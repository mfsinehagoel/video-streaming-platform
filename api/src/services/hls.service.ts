import { spawn } from "child_process";

// The service will execute FFmpeg and generate an HLS playlist.
export function generateHLS(
  inputPath: string,
  outputDirectory: string,
  resolution: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      inputPath,

      "-vf",
      `scale=-2:${resolution}`,

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-c:a",
      "aac",

      "-b:a",
      "128k",

      "-f",
      "hls",

      "-hls_time",
      "6",

      "-hls_playlist_type",
      "vod",

      "-hls_segment_filename",
      `${outputDirectory}/segment%03d.ts`,

      `${outputDirectory}/playlist.m3u8`,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stderr.on("data", (data) => {
      console.log(`FFmpeg: ${data}`);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}
