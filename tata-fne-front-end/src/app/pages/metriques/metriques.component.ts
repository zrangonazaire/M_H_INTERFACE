import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';

import { AuthenticationService } from '../../core/services/authentication.service';
import { AppMetricsOverview, AppMetricsService } from '../../core/services/app-metrics.service';
import { UserConnectionSession } from '../../core/models/user-connection-session';
import { UserConnectionSessionService } from '../../core/services/user-connection-session.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-metriques',
  standalone: true,
  imports: [CommonModule, MenuGauche],
  templateUrl: './metriques.component.html',
  styleUrl: './metriques.component.scss'
})
export class MetriquesComponent implements OnInit, OnDestroy {
  private readonly refreshPeriodMs = 30_000;

  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly loadState = signal<'idle' | 'loading' | 'error'>('idle');
  protected readonly error = signal<string | null>(null);
  protected readonly metrics = signal<AppMetricsOverview | null>(null);

  protected readonly connectionSessions = signal<UserConnectionSession[]>([]);
  protected readonly connectionAuditLoading = signal(false);
  protected readonly connectionError = signal<string | null>(null);
  protected readonly connectionPagination = signal({
    currentPage: 0,
    pageSize: 5
  });
  protected readonly currentTimestamp = signal(Date.now());

  private refreshIntervalId: number | null = null;
  private countdownIntervalId: number | null = null;

  private readonly msFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  private readonly percentFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  private readonly sizeFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

  constructor(
    private readonly authService: AuthenticationService,
    private readonly metricsService: AppMetricsService,
    private readonly userConnectionSessionService: UserConnectionSessionService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadMetrics();
    this.loadConnectionSessions();
    this.startAutoRefresh();
    this.startConnectionCountdown();
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId !== null) {
      window.clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    if (this.countdownIntervalId !== null) {
      window.clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private startAutoRefresh(): void {
    this.refreshIntervalId = window.setInterval(() => {
      this.loadMetrics(false);
      this.loadConnectionSessions(false);
    }, this.refreshPeriodMs);
  }

  private startConnectionCountdown(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.countdownIntervalId = window.setInterval(() => {
      this.currentTimestamp.set(Date.now());
    }, 1000);
  }

  private loadMetrics(showLoading = true): void {
    if (showLoading) {
      this.loadState.set('loading');
    }
    this.error.set(null);

    this.metricsService.getOverview().subscribe({
      next: (overview) => {
        this.metrics.set(overview);
        this.loadState.set('idle');
      },
      error: (err) => {
        this.metrics.set(null);
        const message = err?.error?.message || err?.message || 'Impossible de charger les métriques.';
        this.error.set(message);
        this.loadState.set('error');
      }
    });
  }

  private loadConnectionSessions(showLoader = true): void {
    if (showLoader) {
      this.connectionAuditLoading.set(true);
    }

    this.connectionError.set(null);

    this.userConnectionSessionService.getRecentSessions(100).subscribe({
      next: (sessions) => {
        this.connectionSessions.set(sessions);
        this.ensureConnectionPageInRange();
      },
      error: (err) => {
        const message = err?.error?.message || err?.message || 'Le suivi des connexions est momentanement indisponible.';
        this.connectionError.set(message);
      }
    }).add(() => {
      if (showLoader) {
        this.connectionAuditLoading.set(false);
      }
    });
  }

  private ensureConnectionPageInRange(): void {
    const maxPage = this.getConnectionPageCount() - 1;
    if (this.connectionPagination().currentPage <= maxPage) {
      return;
    }

    this.connectionPagination.update((pagination) => ({
      ...pagination,
      currentPage: maxPage
    }));
  }

  protected getCurrentConnection(): UserConnectionSession | null {
    return this.connectionSessions().find((session) => session.currentSession)
      ?? this.connectionSessions().find((session) => session.status === 'ACTIVE')
      ?? null;
  }

  protected getVisibleConnectionSessions(): UserConnectionSession[] {
    const { currentPage, pageSize } = this.connectionPagination();
    const startIndex = currentPage * pageSize;
    return this.connectionSessions().slice(startIndex, startIndex + pageSize);
  }

  protected getConnectionPageCount(): number {
    const totalItems = this.connectionSessions().length;
    const pageSize = this.connectionPagination().pageSize;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }

  protected changeConnectionPage(page: number): void {
    const maxPage = this.getConnectionPageCount() - 1;
    const nextPage = Math.min(Math.max(page, 0), maxPage);

    this.connectionPagination.update((pagination) => ({
      ...pagination,
      currentPage: nextPage
    }));
  }

  protected changeConnectionPageSize(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target?.value) {
      return;
    }

    const pageSize = Number(target.value);
    this.connectionPagination.set({
      currentPage: 0,
      pageSize
    });
  }

  protected getConnectionStartIndex(): number {
    if (this.connectionSessions().length === 0) {
      return 0;
    }

    return this.connectionPagination().currentPage * this.connectionPagination().pageSize + 1;
  }

  protected getConnectionEndIndex(): number {
    const { currentPage, pageSize } = this.connectionPagination();
    return Math.min((currentPage + 1) * pageSize, this.connectionSessions().length);
  }

  protected getConnectionRemainingMs(connection: UserConnectionSession): number {
    const expiresAtMs = this.parseDate(connection.expiresAt);
    if (expiresAtMs === null) {
      return connection.remainingMs;
    }

    if (connection.status === 'ACTIVE' && connection.disconnectedAt === null) {
      return Math.max(0, expiresAtMs - this.currentTimestamp());
    }

    const disconnectedAtMs = this.parseDate(connection.disconnectedAt);
    if (disconnectedAtMs !== null) {
      return Math.max(0, expiresAtMs - disconnectedAtMs);
    }

    return Math.max(0, connection.remainingMs);
  }

  protected formatConnectionDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    const timestamp = this.parseDate(value);
    if (timestamp === null) {
      return value.replace('T', ' ');
    }

    return this.dateTimeFormatter.format(new Date(timestamp));
  }

  protected formatConnectionRemaining(durationMs: number): string {
    if (durationMs === null || Number.isNaN(durationMs)) {
      return 'Non disponible';
    }

    if (durationMs <= 0) {
      return 'Expiree';
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }

    if (minutes > 0) {
      return `${minutes} min ${seconds}s`;
    }

    return `${seconds}s`;
  }

  protected getConnectionStatusClass(status: UserConnectionSession['status']): string {
    switch (status) {
      case 'ACTIVE':
        return 'connection-status connection-status--active';
      case 'LOGGED_OUT':
        return 'connection-status connection-status--logged-out';
      case 'EXPIRED':
        return 'connection-status connection-status--expired';
      default:
        return 'connection-status';
    }
  }

  protected formatConnectionStatus(status: UserConnectionSession['status']): string {
    return status;
  }

  private parseDate(value: string | null): number | null {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  protected clampPercent(value: number | null | undefined): number {
    const next = Number(value);
    if (!Number.isFinite(next)) return 0;
    return Math.max(0, Math.min(100, next));
  }

  protected formatPercent(value: number | null | undefined): string {
    const next = Number(value);
    if (!Number.isFinite(next)) return '-';
    return `${this.percentFormatter.format(next)} %`;
  }

  protected formatMs(value: number | null | undefined): string {
    const next = Number(value);
    if (!Number.isFinite(next)) return '-';
    return `${this.msFormatter.format(next)} ms`;
  }

  protected formatMo(bytes: number | null | undefined): string {
    const next = Number(bytes);
    if (!Number.isFinite(next) || next < 0) return '-';
    const mo = Math.round(next / 1024 / 1024);
    return `${mo} Mo`;
  }

  protected formatDataSize(bytes: number | null | undefined): string {
    const next = Number(bytes);
    if (!Number.isFinite(next) || next < 0) return '-';

    const units = ['o', 'Ko', 'Mo', 'Go', 'To'] as const;
    let value = next;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${this.sizeFormatter.format(value)} ${units[unitIndex]}`;
  }

  protected formatClock(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('fr-FR', { hour12: false });
  }

  protected isUp(status: string | null | undefined): boolean {
    return (status ?? '').toUpperCase() === 'UP';
  }
}
