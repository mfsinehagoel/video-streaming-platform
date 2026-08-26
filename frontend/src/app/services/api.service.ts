import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Video } from '../models/video.model';

export interface VideosResponse {
  success: boolean;
  videos: Video[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface VideoResponse {
  success: boolean;
  video: Video;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);

  private readonly baseUrl = '/api';

  getVideos(page = 1, limit = 12, search?: string, status?: string): Observable<VideosResponse> {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };

    if (search) {
      params['search'] = search;
    }

    if (status) {
      params['status'] = status;
    }

    return this.http.get<VideosResponse>(`${this.baseUrl}/videos`, { params });
  }

  getVideoById(id: number): Observable<{ success: boolean; video: Video }> {
    return this.http.get<{ success: boolean; video: Video }>(`${this.baseUrl}/videos/${id}`);
  }

  getThumbnailUrl(id: number): string {
    return `${this.baseUrl}/videos/${id}/thumbnail`;
  }

  getHlsUrl(id: number): string {
    return `${this.baseUrl}/videos/${id}/hls/master.m3u8`;
  }

  getDownloadUrl(id: number): string {
    return `${this.baseUrl}/videos/${id}/download`;
  }

  getStatusUrl(id: number): string {
    return `${this.baseUrl}/videos/${id}/status`;
  }

  deleteVideo(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/videos/${id}`);
  }

  uploadVideo(file: File, title: string, userId: number = 1) {
    const formData = new FormData();

    formData.append('video', file);
    formData.append('title', title);
    formData.append('userId', userId.toString());

    return this.http.post<{
      success: boolean;
      message: string;
      video: {
        id: number;
        title: string;
        originalFilename: string;
        fileSize: number;
        status: string;
        originalObjectKey: string;
      };
    }>('/api/videos/upload', formData);
  }
}
