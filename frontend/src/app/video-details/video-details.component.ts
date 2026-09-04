import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import Hls from 'hls.js';

@Component({
  selector: 'app-video-details',
  templateUrl: './video-details.component.html',
  styleUrl: './video-details.component.css',
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class VideoDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer')
  videoPlayer!: ElementRef<HTMLVideoElement>;

  video: any = null;
  videoId: string | null = null;

  loading = true;
  error = '';
  deleting = false;

  private viewCounted = false;
  private cdr = inject(ChangeDetectorRef);
  private hls: Hls | null = null;

  qualityLevels: {
    index: number;
    height: number;
    bitrate: number;
  }[] = [];

  selectedQuality = -1;

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

        if (this.video.hlsObjectKey) {
          setTimeout(() => {
            this.initializeHLS();
          });
        }
      },

      error: (error) => {
        this.error = 'Failed to load video';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  initializeHLS(): void {
    const video = this.videoPlayer.nativeElement;
    video.addEventListener('play', () => {
      this.countView();
    });

    const hlsUrl = this.hlsUrl;

    if (Hls.isSupported()) {
      this.hls = new Hls();

      this.hls.loadSource(hlsUrl);

      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.qualityLevels = this.hls!.levels.map((level, index) => ({
          index,
          height: level.height,
          bitrate: level.bitrate,
        }))
          .filter((level) => level.height > 0)
          .sort((a, b) => b.height - a.height);
        this.cdr.detectChanges();
      });

      this.hls.on(Hls.Events.ERROR, () => {});

      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    }
  }

  changeQuality(levelIndex: number): void {
    if (!this.hls) {
      return;
    }

    this.selectedQuality = levelIndex;

    this.hls.currentLevel = levelIndex;
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

  get hlsUrl(): string {
    return `/api/videos/${this.videoId}/hls/master.m3u8`;
  }

  private countView(): void {
    if (!this.videoId || this.viewCounted) {
      return;
    }

    this.viewCounted = true;

    this.http.post(`/api/videos/${this.videoId}/view`, {}).subscribe({
      error: () => {
        this.viewCounted = false;
      },
    });
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
        this.router.navigate(['/videos']);
      },

      error: () => {
        this.deleting = false;
        alert('Failed to delete video. Please try again.');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}
