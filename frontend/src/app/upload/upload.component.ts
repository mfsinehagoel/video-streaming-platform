import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
})
export class UploadComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  selectedFile: File | null = null;

  title = '';

  uploading = false;

  successMessage = '';

  errorMessage = '';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.selectedFile = null;
      return;
    }

    this.selectedFile = input.files[0];

    if (!this.title) {
      this.title = this.selectedFile.name.replace(/\.[^/.]+$/, '');
    }

    this.errorMessage = '';
    this.successMessage = '';
  }

  upload(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a video file.';
      return;
    }

    if (!this.title.trim()) {
      this.errorMessage = 'Please enter a video title.';
      return;
    }

    this.uploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.uploadVideo(this.selectedFile, this.title.trim(), 1).subscribe({
      next: (response) => {
        console.log('Upload response:', response);

        this.uploading = false;

        this.successMessage = 'Video uploaded successfully and processing has started.';

        this.selectedFile = null;
        this.title = '';

        setTimeout(() => {
          this.router.navigate(['/videos']);
        }, 1500);
      },

      error: (error) => {
        console.error('Upload failed:', error);

        this.uploading = false;

        this.errorMessage = error?.error?.message || 'Video upload failed. Please try again.';
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/videos']);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];

    let size = bytes;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index++;
    }

    return `${size.toFixed(2)} ${units[index]}`;
  }
}
