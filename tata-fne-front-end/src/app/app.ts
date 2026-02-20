import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router, RouterOutlet, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';

type EnvironmentInfo = {
  label?: string;
  baseUrl?: string;
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly showEnvironmentBanner = signal(false);
  protected readonly environmentLabel = signal('ENVIRONNEMENT DE TEST');
  protected readonly environmentBaseUrl = signal('');

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient
  ) {
    this.showEnvironmentBanner.set(this.shouldShowEnvironmentBanner(this.router.url));
    this.loadEnvironmentLabel();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.showEnvironmentBanner.set(this.shouldShowEnvironmentBanner(event.urlAfterRedirects));
      });
  }

  private loadEnvironmentLabel(): void {
    this.http
      .get<EnvironmentInfo>(`${environment.apiBaseUrl}/new-invoices/environment-label`)
      .subscribe({
        next: (environmentInfo) => {
          const label = environmentInfo?.label;
          const baseUrl = environmentInfo?.baseUrl?.trim() ?? '';

          this.environmentBaseUrl.set(baseUrl);

          if (label === 'ENVIRONNEMENT DE PRODUCTION' || label === 'ENVIRONNEMENT DE TEST') {
            this.environmentLabel.set(label);
            return;
          }
          this.environmentLabel.set('ENVIRONNEMENT DE TEST');
        },
        error: () => {
          this.environmentLabel.set('ENVIRONNEMENT DE TEST');
          this.environmentBaseUrl.set('');
        }
      });
  }

  private shouldShowEnvironmentBanner(url: string): boolean {
    return url !== '/' && !url.startsWith('/login');
  }
}
