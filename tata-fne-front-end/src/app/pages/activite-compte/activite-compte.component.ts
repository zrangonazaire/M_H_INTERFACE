import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UserActionAuditLog } from '../../core/models/user-action-audit-log';
import { AuthenticationService } from '../../core/services/authentication.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserActionAuditService } from '../../core/services/user-action-audit.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-activite-compte',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuGauche],
  templateUrl: './activite-compte.component.html',
  styleUrl: './activite-compte.component.scss'
})
export class ActiviteCompteComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly error = signal<string | null>(null);

  protected readonly auditLogs = signal<UserActionAuditLog[]>([]);
  protected readonly auditModules = signal<string[]>([]);
  protected readonly auditLoading = signal(false);
  protected readonly expandedAuditLogId = signal<number | null>(null);
  protected readonly auditPagination = signal({
    currentPage: 0,
    pageSize: 8,
    totalItems: 0,
    totalPages: 1
  });

  protected auditFilterForm = this.createDefaultAuditFilterForm();
  protected readonly auditHttpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  protected readonly auditResultOptions = [
    { value: 'SUCCESS', label: 'Succes' },
    { value: 'ERROR', label: 'Echec' }
  ];

  private readonly dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });

  constructor(
    private readonly auth: AuthenticationService,
    private readonly notificationService: NotificationService,
    private readonly userActionAuditService: UserActionAuditService
  ) {
    this.userFullName.set(this.auth.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.auth.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.auth.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadAuditModules();
    this.loadAuditLogs(0);
  }

  protected loadAuditLogs(page = this.auditPagination().currentPage): void {
    const nextPage = Math.max(page, 0);
    this.auditLoading.set(true);
    this.error.set(null);
    this.expandedAuditLogId.set(null);

    this.userActionAuditService.getAuditLogs({
      page: nextPage,
      size: this.auditPagination().pageSize,
      ...this.buildAuditFilters()
    }).subscribe({
      next: (result) => {
        this.auditLogs.set(result.auditLogs);
        this.auditPagination.set({
          currentPage: result.currentPage,
          pageSize: this.auditPagination().pageSize,
          totalItems: result.totalItems,
          totalPages: Math.max(1, result.totalPages)
        });
      },
      error: (err) => {
        const message = err?.error?.message || err?.message || 'Le journal d audit est momentanement indisponible.';
        this.error.set(message);
        this.notificationService.warning(message);
      }
    }).add(() => this.auditLoading.set(false));
  }

  protected loadAuditModules(): void {
    this.userActionAuditService.getModules().subscribe({
      next: (modules) => this.auditModules.set(modules),
      error: () => {
        this.auditModules.set([]);
      }
    });
  }

  protected applyAuditFilters(): void {
    this.loadAuditLogs(0);
  }

  protected resetAuditFilters(): void {
    this.auditFilterForm = this.createDefaultAuditFilterForm();
    this.loadAuditLogs(0);
  }

  protected changeAuditPage(page: number): void {
    const maxPage = Math.max(0, this.auditPagination().totalPages - 1);
    this.loadAuditLogs(Math.min(Math.max(page, 0), maxPage));
  }

  protected changeAuditPageSize(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target?.value) {
      return;
    }

    this.auditPagination.update((pagination) => ({
      ...pagination,
      currentPage: 0,
      pageSize: Number(target.value)
    }));
    this.loadAuditLogs(0);
  }

  protected toggleAuditDetails(id: number): void {
    this.expandedAuditLogId.update((currentId) => currentId === id ? null : id);
  }

  protected isAuditExpanded(id: number): boolean {
    return this.expandedAuditLogId() === id;
  }

  protected getAuditStartIndex(): number {
    if (this.auditPagination().totalItems === 0) {
      return 0;
    }

    return this.auditPagination().currentPage * this.auditPagination().pageSize + 1;
  }

  protected getAuditEndIndex(): number {
    return Math.min(
      (this.auditPagination().currentPage + 1) * this.auditPagination().pageSize,
      this.auditPagination().totalItems
    );
  }

  protected getAuditSummary(auditLog: UserActionAuditLog): string {
    return `${auditLog.httpMethod} | HTTP ${auditLog.httpStatus} | ${auditLog.durationMs} ms | IP ${auditLog.clientIp ?? 'N/A'}`;
  }

  protected getAuditResultClass(result: string): string {
    return result === 'SUCCESS'
      ? 'audit-result audit-result--success'
      : 'audit-result audit-result--error';
  }

  protected formatAuditResult(result: string): string {
    return result === 'SUCCESS' ? 'Succes' : 'Echec';
  }

  protected getAuditUserName(auditLog: UserActionAuditLog): string {
    return auditLog.userFullName?.trim() || 'Utilisateur inconnu';
  }

  protected getAuditUserEmail(auditLog: UserActionAuditLog): string {
    return auditLog.userEmail?.trim() || 'Session non authentifiee';
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

  private parseDate(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private buildAuditFilters(): {
    search?: string;
    module?: string;
    httpMethod?: string;
    result?: string;
    fromDate?: string;
    toDate?: string;
  } {
    return {
      search: this.auditFilterForm.search || undefined,
      module: this.auditFilterForm.module || undefined,
      httpMethod: this.auditFilterForm.httpMethod || undefined,
      result: this.auditFilterForm.result || undefined,
      fromDate: this.auditFilterForm.fromDate || undefined,
      toDate: this.auditFilterForm.toDate || undefined
    };
  }

  private createDefaultAuditFilterForm(): {
    search: string;
    module: string;
    httpMethod: string;
    result: string;
    fromDate: string;
    toDate: string;
  } {
    return {
      search: '',
      module: '',
      httpMethod: '',
      result: '',
      fromDate: '',
      toDate: ''
    };
  }
}
