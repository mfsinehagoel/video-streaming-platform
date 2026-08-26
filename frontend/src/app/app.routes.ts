import { Routes } from '@angular/router';
import { VideosComponent } from './videos/videos.component';
import { UploadComponent } from './upload/upload.component';
import { VideoDetailsComponent } from './video-details/video-details.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'videos',
    pathMatch: 'full',
  },
  {
    path: 'videos',
    component: VideosComponent,
  },
  {
    path: 'upload',
    component: UploadComponent,
  },
  {
    path: 'video/:id',
    component: VideoDetailsComponent,
  },
];
