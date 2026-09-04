import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { ApiService } from '../services/api.service';
import { Video } from '../models/video.model';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './videos.component.html',
  styleUrl: './videos.component.css',
})
export class VideosComponent implements OnInit {
  videos: Video[] = [];

  loading = true;
  error = '';

  user: any;
  searchTerm = '';

  currentPage = 1;
  pageSize = 12;

  totalVideos = 0;
  totalPages = 0;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.user = this.authService.getUser();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchTerm = params['search'] || '';
      this.currentPage = 1;
      this.loadVideos();
    });
  }

  loadVideos(): void {
    this.loading = true;
    this.error = '';

    this.api.getVideos(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (response) => {
        this.videos = response.videos;

        this.totalVideos = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.page;

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

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.loadVideos();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadVideos();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadVideos();
    }
  }

  searchVideos(): void {
    const search = this.searchTerm.trim();
    this.currentPage = 1;

    this.router.navigate(['/videos'], {
      queryParams: search ? { search } : {},
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
	this.currentPage = 1;

    this.router.navigate(['/videos']);
  }

  watchVideo(video: Video): void {
    this.router.navigate(['/video', video.id]);
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
