import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ExpiryFilter, FilterSidebarService } from '../../../core/services/filter-sidebar.service';
import { HttpApiService } from '../../../core/services/http-api.service';
import { DashboardInventoryAlert } from '../../../core/types/resource.types';
import { InventoryCardComponent, InventoryCardItem } from '../../inventory/inventory-card/inventory-card.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

type AlertTone = 'danger' | 'warning';

const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
});

@Component({
  selector: 'app-inventory-alerts',
  standalone: true,
  imports: [CommonModule, InventoryCardComponent, LoadingStateComponent],
  templateUrl: './inventory-alerts.component.html',
  styleUrl: './inventory-alerts.component.scss',
})
export class InventoryAlertsComponent {
  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterSidebar = inject(FilterSidebarService);

  protected inventoryAlerts: DashboardInventoryAlert[] = [];
  protected errorMessage = '';
  protected loading = true;
  private readonly savingConsumedIds = new Set<number>();

  constructor() {
    this.api
      .dashboardInventoryAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (inventoryAlerts) => {
          this.inventoryAlerts = this.sortAlerts(
            inventoryAlerts.filter((alert) => alert.estado_dias_aviso !== null && alert.dias_restantes >= 0 && !alert.consumido),
          );
          this.filterSidebar.setAvailableCategories(this.inventoryAlerts.map((alert) => alert.producto_categoria));
          this.loading = false;
        },
        error: () => {
          this.filterSidebar.setAvailableCategories([]);
          this.errorMessage = 'No se pudieron cargar los avisos del inventario.';
          this.loading = false;
        },
      });
  }

  protected filteredInventoryAlerts(): DashboardInventoryAlert[] {
    return this.inventoryAlerts.filter(
      (alert) =>
        alert.dias_restantes >= 0 &&
        !alert.consumido &&
        this.filterSidebar.matchesSearch([alert.producto_nombre, alert.producto_codigo_barras]) &&
        this.filterSidebar.matchesCategory(alert.producto_categoria) &&
        this.filterSidebar.matchesConsumed(Boolean(alert.consumido)) &&
        this.filterSidebar.matchesExpiry(this.resolveExpiryFilter(alert)),
    );
  }

  protected isToggleSaving(alert: InventoryCardItem): boolean {
    return this.savingConsumedIds.has(alert.id_inventario);
  }

  protected toggleConsumed(alert: InventoryCardItem): void {
    if (this.savingConsumedIds.has(alert.id_inventario)) {
      return;
    }

    const nextConsumedValue = !Boolean(alert.consumido);
    if (
      nextConsumedValue &&
      !window.confirm(
        'Este producto se marcara como consumido.',
      )
    ) {
      return;
    }

    this.savingConsumedIds.add(alert.id_inventario);

    this.api.patch<DashboardInventoryAlert>('inventarios', alert.id_inventario, { consumido: nextConsumedValue }).subscribe({
      next: (updatedAlert) => {
        this.inventoryAlerts = this.sortAlerts(
          this.inventoryAlerts.map((candidate) =>
            candidate.id_inventario === alert.id_inventario ? { ...candidate, ...updatedAlert } : candidate,
          ),
        );
        this.filterSidebar.setAvailableCategories(this.filteredInventoryAlerts().map((candidate) => candidate.producto_categoria));
        this.errorMessage = '';
        this.savingConsumedIds.delete(alert.id_inventario);
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar si el producto esta consumido.';
        this.savingConsumedIds.delete(alert.id_inventario);
      },
    });
  }

  protected resolveTone(alert: DashboardInventoryAlert): AlertTone {
    const color = (alert.estado_color || '').toLowerCase();
    if (color.includes('rojo') || alert.dias_restantes <= 2) {
      return 'danger';
    }

    return 'warning';
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

  protected formatShortDate(value: string): string {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return shortDateFormatter.format(parsedDate);
  }

  protected resolveToneLabel(alert: DashboardInventoryAlert): string {
    return this.resolveTone(alert) === 'danger' ? 'Caduca muy pronto' : 'Consumir pronto';
  }

  protected resolveImageUrl(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private sortAlerts(alerts: DashboardInventoryAlert[]): DashboardInventoryAlert[] {
    return [...alerts].sort((left, right) => {
      const toneDifference = Number(this.resolveTone(left) !== 'danger') - Number(this.resolveTone(right) !== 'danger');
      if (toneDifference !== 0) {
        return toneDifference;
      }

      const dayDifference = left.dias_restantes - right.dias_restantes;
      if (dayDifference !== 0) {
        return dayDifference;
      }

      return left.producto_nombre.localeCompare(right.producto_nombre, 'es');
    });
  }

  private resolveExpiryFilter(alert: DashboardInventoryAlert): ExpiryFilter {
    if (this.resolveTone(alert) === 'danger') {
      return 'danger';
    }

    return 'warning';
  }
}
