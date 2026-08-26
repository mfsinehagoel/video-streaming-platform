import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-details',
  templateUrl: './video-details.component.html',
  styleUrl: './video-details.component.css',
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class VideoDetailsComponent implements OnInit {
  video: any = null;
  videoId: string | null = null;

  loading = true;
  error = '';
  deleting = false;
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.videoId = this.route.snapshot.paramMap.get('id');

    if (!this.videoId) {
      this.error = 'Video ID is missing';
      this.loading = false;
      return;
    }

    this.loadVideo();
  }

  loadVideo(): void {
    this.http.get<any>(`/api/videos/${this.videoId}`).subscribe({
      next: (response) => {
        this.video = response.video;

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load video';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get videoUrl(): string {
    return `/api/videos/${this.videoId}/stream`;
  }

  get thumbnailUrl(): string {
    return `/api/videos/${this.videoId}/thumbnail`;
  }

  get downloadUrl(): string {
    return `/api/videos/${this.videoId}/download`;
  }

  deleteVideo(): void {
    if (!this.videoId || this.deleting) {
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete "${this.video.title}"?`);

    if (!confirmed) {
      return;
    }

    this.deleting = true;

    this.http.delete<any>(`/api/videos/${this.videoId}`).subscribe({
      next: (response) => {
        console.log('Video deleted:', response);

        this.router.navigate(['/videos']);
      },

      error: (error) => {
        console.error('Failed to delete video:', error);

        this.deleting = false;

        alert('Failed to delete video. Please try again.');
      },
    });
  }
}
