import { spawn } from "child_process";

export function generateThumbnail(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputPath,

      "-ss",
      "00:00:01",

      "-frames:v",
      "1",

      "-q:v",
      "2",

      "-y",

      outputPath,
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with exit code ${code}: ${stderr}`));
      }
    });
  });
}
