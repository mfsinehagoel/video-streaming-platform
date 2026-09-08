import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fileSize: number;
}

interface FFprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
}

interface FFprobeFormat {
  duration?: string;
  size?: string;
}

interface FFprobeOutput {
  streams?: FFprobeStream[];
  format?: FFprobeFormat;
}

export async function extractVideoMetadata(
  filePath: string,
): Promise<VideoMetadata> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const result: FFprobeOutput = JSON.parse(stdout);

  const videoStream = result.streams?.find(
    (stream) => stream.codec_type === "video",
  );

  if (!videoStream) {
    throw new Error("No video stream found");
  }

  const duration = Number(result.format?.duration);
  const fileSize = Number(result.format?.size);

  if (!Number.isFinite(duration)) {
    throw new Error("Unable to determine video duration");
  }

  if (!Number.isFinite(fileSize)) {
    throw new Error("Unable to determine video file size");
  }

  if (!videoStream.width || !videoStream.height) {
    throw new Error("Unable to determine video resolution");
  }

  if (!videoStream.codec_name) {
    throw new Error("Unable to determine video codec");
  }

  return {
    duration,
    width: videoStream.width,
    height: videoStream.height,
    codec: videoStream.codec_name,
    fileSize,
  };
}
