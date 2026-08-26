import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
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
}
