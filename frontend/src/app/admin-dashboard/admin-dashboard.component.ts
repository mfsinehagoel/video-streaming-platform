import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface DashboardStats {
  videos: {
    total: number;
    storageUsage: number;
    uploads: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };

  jobs: {
    active: number;
    queued: number;
    failed: number;
  };

  averageProcessingTime: number;

  statistics: {
    views: number;
    downloads: number;
  };
}

interface AdminVideo {
  id: number;
  title: string;
  originalFilename?: string;

  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  resolution?: string;
  duration?: number;
  fileSize?: number;

  createdAt?: string;

  views?: number;
  downloads?: number;
  processingJob?: {
    id: number;
    status: string;
    attempts: number;
    errorMessage: string | null;
  };
}

interface VideoFilters {
  status: string;
  resolution: string;
  dateFrom: string;
  dateTo: string;
  minDuration: number | null;
  maxDuration: number | null;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  loadingVideos = false;

  error = '';

  stats: DashboardStats = {
    videos: {
      total: 0,
      storageUsage: 0,
      uploads: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    },

    jobs: {
      active: 0,
      queued: 0,
      failed: 0,
    },

    averageProcessingTime: 0,

    statistics: {
      views: 0,
      downloads: 0,
    },
  };

  videos: AdminVideo[] = [];

  filters: VideoFilters = {
    status: '',
    resolution: '',
    dateFrom: '',
    dateTo: '',
    minDuration: null,
    maxDuration: null,
  };

  retryingJobId: number | null = null;

  ngOnInit(): void {
    this.loadDashboard();
    this.loadVideos();
  }

  // --------------------------------------------------
  // Dashboard statistics
  // --------------------------------------------------

  loadDashboard(): void {
    this.loading = true;
    this.error = '';

    this.http.get<DashboardStats>('/api/admin/dashboard').subscribe({
      next: (response: any) => {
        console.log('Admin dashboard:', response);

        this.stats = response.data;

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Failed to load admin dashboard:', error);

        this.error = 'Failed to load dashboard statistics.';

        this.loading = false;

        this.cdr.detectChanges();
      },
    });
  }

  // --------------------------------------------------
  // Videos
  // --------------------------------------------------

  loadVideos(): void {
    this.loadingVideos = true;

    const params: Record<string, string> = {};

    if (this.filters.status) {
      params['status'] = this.filters.status;
    }

    if (this.filters.resolution) {
      params['resolution'] = this.filters.resolution;
    }

    if (this.filters.dateFrom) {
      params['dateFrom'] = this.filters.dateFrom;
    }

    if (this.filters.dateTo) {
      params['dateTo'] = this.filters.dateTo;
    }

    if (this.filters.minDuration !== null) {
      params['minDuration'] = this.filters.minDuration.toString();
    }

    if (this.filters.maxDuration !== null) {
      params['maxDuration'] = this.filters.maxDuration.toString();
    }

    this.http
      .get<AdminVideo[]>('/api/admin/videos', {
        params,
      })
      .subscribe({
        next: (response: any) => {
          console.log('Admin videos:', response);

          this.videos = response.data;

          this.loadingVideos = false;

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('Failed to load admin videos:', error);

          this.videos = [];

          this.loadingVideos = false;

          this.cdr.detectChanges();
        },
      });
  }

  applyFilters(): void {
    this.loadVideos();
  }

  clearFilters(): void {
    this.filters = {
      status: '',
      resolution: '',
      dateFrom: '',
      dateTo: '',
      minDuration: null,
      maxDuration: null,
    };

    this.loadVideos();
  }

  // --------------------------------------------------
  // Retry failed job
  // --------------------------------------------------

  retryJob(video: AdminVideo): void {
    if (video.status !== 'FAILED' || !video.processingJob) {
      return;
    }

    const confirmed = confirm(`Retry processing for "${video.title}"?`);

    if (!confirmed) {
      return;
    }

    const jobId = video.processingJob.id;

    this.retryingJobId = jobId;

    this.http.post(`/api/admin/jobs/${jobId}/retry`, {}).subscribe({
      next: (response) => {
        console.log('Processing job retry requested:', response);

        video.status = 'QUEUED';

        this.retryingJobId = null;

        this.loadDashboard();
        this.loadVideos();
      },

      error: (error) => {
        console.error('Failed to retry processing job:', error);

        alert('Failed to retry processing job. Please try again.');

        this.retryingJobId = null;
      },
    });
  }

  // --------------------------------------------------
  // Formatting helpers
  // --------------------------------------------------

  formatStorage(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];

    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    const value = bytes / Math.pow(1024, index);

    return `${value.toFixed(2)} ${units[index]}`;
  }

  formatDuration(seconds: number | undefined): string {
    if (seconds === undefined || seconds === null) {
      return '-';
    }

    const totalSeconds = Math.floor(seconds);

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  }

  formatProcessingTime(milliseconds: number): string {
    if (!milliseconds || milliseconds <= 0) {
      return '-';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }

  formatDate(date: string | undefined): string {
    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleString();
  }
}
