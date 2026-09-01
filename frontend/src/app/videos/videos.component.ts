import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Video } from '../models/video.model';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './videos.component.html',
  styleUrl: './videos.component.css',
})
export class VideosComponent implements OnInit {
  videos: Video[] = [];

  loading = true;
  error = '';

  user: any;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {
    this.user = this.authService.getUser();
	console.log(this.user);
  }

  ngOnInit(): void {
    this.loadVideos();
  }

  loadVideos(): void {
    this.loading = true;
    this.error = '';

    this.api.getVideos(1, 12).subscribe({
      next: (response) => {
        this.videos = response.videos;
        this.loading = false;

        this.cdr.detectChanges();
      },

      error: () => {
        this.error = 'Failed to load videos';
        this.loading = false;

        this.cdr.detectChanges();
      },
    });
  }

  getThumbnail(video: Video): string {
    return this.api.getThumbnailUrl(video.id);
  }

  formatDuration(seconds: number | null): string {
    if (seconds === null) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  goToUpload() {
    this.router.navigate(['/upload']);
  }

  goToAdminDashboard() {
    this.router.navigate(['/admin-dashboard']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
