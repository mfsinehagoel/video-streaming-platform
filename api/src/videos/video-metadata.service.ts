import ffprobe from "ffprobe-static";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
}

export async function extractVideoMetadata(
  filePath: string,
): Promise<VideoMetadata> {
  const { stdout } = await execFileAsync(ffprobe.path, [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const data = JSON.parse(stdout);

  const videoStream = data.streams?.find(
    (stream: any) => stream.codec_type === "video",
  );

  return {
    duration: data.format?.duration ? Number(data.format.duration) : null,

    width: videoStream?.width ? Number(videoStream.width) : null,

    height: videoStream?.height ? Number(videoStream.height) : null,

    codec: videoStream?.codec_name ?? null,
  };
}
