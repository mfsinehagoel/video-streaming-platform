export interface Video {
  id: number;
  userId: number;
  title: string;
  originalFilename: string;
  fileSize: number;

  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;

  status: 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  originalObjectKey: string | null;
  thumbnailObjectKey: string | null;
  hlsObjectKey: string | null;

  createdAt: string;
  updatedAt: string;
}
