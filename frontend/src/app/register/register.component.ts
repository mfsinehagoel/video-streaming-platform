import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  name = '';
  email = '';
  password = '';

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  register(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name || !this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.loading = true;

    this.authService.register(
      this.name,
      this.email,
      this.password
    ).subscribe({

      next: (response) => {

        this.loading = false;

        if (response.success) {

          this.successMessage =
            'Registration successful. Redirecting to login...';

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1000);

        } else {

          this.errorMessage =
            response.message || 'Registration failed.';
        }
      },

      error: (error) => {

        this.loading = false;

        this.errorMessage =
          error.error?.message ||
          'Registration failed. Please try again.';
      }

    });
  }
}