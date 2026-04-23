import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { NAV_LINKS } from '../core/config/resources.config';
import { AuthService } from '../core/services/auth.service';
import { FilterSidebarService } from '../core/services/filter-sidebar.service';
import { HttpApiService } from '../core/services/http-api.service';
import { DashboardInventoryAlert } from '../core/types/resource.types';
import { FilterSidebarComponent } from '../components/filters/filter-sidebar/filter-sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, FilterSidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  @ViewChild('notificationButton') private notificationButton?: ElementRef<HTMLButtonElement>;

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(HttpApiService);
  private readonly filterSidebar = inject(FilterSidebarService);

  protected readonly authService = inject(AuthService);
  protected readonly navLinks = NAV_LINKS;
  protected readonly currentUrl = signal(this.router.url);
  protected readonly notificationPanelOpen = signal(false);
  protected readonly notificationPanelLeft = signal(16);
  protected readonly notificationPanelTop = signal(72);
  protected readonly notificationPanelWidth = signal(420);
  protected readonly todayNotificationAlerts = signal<DashboardInventoryAlert[]>([]);
  protected readonly previousNotificationAlerts = signal<DashboardInventoryAlert[]>([]);
  protected readonly previousNotificationsOpen = signal(false);
  protected readonly notificationCount = computed(
    () => this.todayNotificationAlerts().length + this.previousNotificationAlerts().length,
  );
  protected readonly currentSectionLabel = computed(
    () => this.navLinks.find((link) => this.matchesRoute(link.path))?.label || 'Dashboard',
  );
  protected readonly showFilterSidebar = computed(() => {
    const currentUrl = this.currentUrl();
    return (
      !currentUrl.startsWith('/recipes') &&
      !currentUrl.startsWith('/statistics') &&
      !currentUrl.startsWith('/nosotros')
    );
  });

  constructor() {
    this.filterSidebar.clearAvailableCategories();
    this.loadNotifications();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.notificationPanelOpen.set(false);
        this.previousNotificationsOpen.set(false);
        this.filterSidebar.clearAvailableCategories();
        this.loadNotifications();
      });
  }

  protected matchesRoute(path: string): boolean {
    const currentUrl = this.currentUrl();
    return currentUrl === path || currentUrl.startsWith(`${path}/`);
  }

  @HostListener('window:resize')
  protected handleWindowResize(): void {
    if (this.notificationPanelOpen()) {
      this.updateNotificationPanelPosition();
    }
  }

  protected toggleNotificationPanel(): void {
    const shouldOpen = !this.notificationPanelOpen();

    if (shouldOpen) {
      this.updateNotificationPanelPosition();
    }

    this.notificationPanelOpen.set(shouldOpen);

    if (shouldOpen) {
      requestAnimationFrame(() => this.updateNotificationPanelPosition());
    } else {
      this.previousNotificationsOpen.set(false);
    }
  }

  protected togglePreviousNotifications(): void {
    this.previousNotificationsOpen.update((isOpen) => !isOpen);
    requestAnimationFrame(() => this.updateNotificationPanelPosition());
  }

  protected resolveNotificationLabel(alert: DashboardInventoryAlert): string {
    const color = (alert.estado_color || '').toLowerCase();
    if (color.includes('rojo') || alert.dias_restantes <= 2) {
      return 'Caduca muy pronto';
    }

    return 'Consumir pronto';
  }

  protected formatRemainingDays(days: number): string {
    if (days < 0) {
      return `Caducado hace ${Math.abs(days)} dias`;
    }
    if (days === 0) {
      return 'Caduca hoy';
    }
    if (days === 1) {
      return 'Falta 1 dia';
    }

    return `Faltan ${days} dias`;
  }

  private loadNotifications(): void {
    this.api
      .dashboardInventoryAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alerts) => {
          const activeAlerts = alerts.filter(
            (alert) => alert.estado_dias_aviso !== null && alert.dias_restantes >= 0 && !alert.consumido,
          );
          // Los separo asi para enseñar primero lo que acaba de entrar hoy y dejar lo anterior en una lista aparte.
          this.todayNotificationAlerts.set(
            this.sortNotifications(activeAlerts.filter((alert) => alert.dias_restantes === alert.estado_dias_aviso)),
          );
          this.previousNotificationAlerts.set(
            this.sortNotifications(activeAlerts.filter((alert) => alert.dias_restantes < Number(alert.estado_dias_aviso))),
          );
        },
        error: () => {
          this.todayNotificationAlerts.set([]);
          this.previousNotificationAlerts.set([]);
        },
      });
  }

  private sortNotifications(alerts: DashboardInventoryAlert[]): DashboardInventoryAlert[] {
    return [...alerts].sort((left, right) => {
      const dayDifference = left.dias_restantes - right.dias_restantes;
      if (dayDifference !== 0) {
        return dayDifference;
      }

      return left.producto_nombre.localeCompare(right.producto_nombre, 'es');
    });
  }

  private updateNotificationPanelPosition(): void {
    if (!this.notificationButton || typeof window === 'undefined') {
      return;
    }

    // Intento centrar el panel en el icono, pero evitando que se salga por la derecha o la izquierda en pantallas estrechas al haber hecho pruebas responsive.
    const viewportMargin = 16;
    const viewportWidth = window.innerWidth;
    const panelWidth = Math.min(420, Math.max(0, viewportWidth - viewportMargin * 2));
    const buttonRect = this.notificationButton.nativeElement.getBoundingClientRect();
    const buttonCenter = buttonRect.left + buttonRect.width / 2;
    const centeredLeft = buttonCenter - panelWidth / 2;
    const maxLeft = Math.max(viewportMargin, viewportWidth - panelWidth - viewportMargin);
    const safeLeft = Math.min(Math.max(centeredLeft, viewportMargin), maxLeft);

    this.notificationPanelWidth.set(panelWidth);
    this.notificationPanelLeft.set(safeLeft);
    this.notificationPanelTop.set(buttonRect.bottom + 10);
  }
}
