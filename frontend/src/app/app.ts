import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private apiService = inject(ApiService);

  message = signal('Checking API...');

  ngOnInit(): void {
    this.apiService.getHealth().subscribe({
      next: (response) => {
        this.message.set(response.message);
      },

      error: () => {
        this.message.set('API connection failed');
      },
    });
  }
}
