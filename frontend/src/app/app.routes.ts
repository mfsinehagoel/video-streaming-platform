import { Routes } from '@angular/router';
import { VideosComponent } from './videos/videos.component';
import { UploadComponent } from './upload/upload.component';
import { VideoDetailsComponent } from './video-details/video-details.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'videos',
    component: VideosComponent,
    canActivate: [authGuard],
  },
  {
    path: 'upload',
    component: UploadComponent,
    canActivate: [authGuard],
  },
  {
    path: 'video/:id',
    component: VideoDetailsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
  },
  {
    path: '',
    redirectTo: 'videos',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: 'videos',
  },
];
