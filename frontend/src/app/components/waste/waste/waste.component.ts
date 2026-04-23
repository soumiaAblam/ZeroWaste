import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ExpiryFilter, FilterSidebarService } from '../../../core/services/filter-sidebar.service';
import { HttpApiService } from '../../../core/services/http-api.service';
import { DashboardInventoryAlert } from '../../../core/types/resource.types';
import { InventoryCardComponent, InventoryCardItem } from '../../inventory/inventory-card/inventory-card.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

@Component({
  selector: 'app-waste',
  standalone: true,
  imports: [CommonModule, InventoryCardComponent, LoadingStateComponent],
  templateUrl: './waste.component.html',
  styleUrl: './waste.component.scss',
})
export class WasteComponent {
  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterSidebar = inject(FilterSidebarService);
  private readonly savingConsumedIds = new Set<number>();

  protected expiredItems: DashboardInventoryAlert[] = [];
  protected errorMessage = '';
  protected loading = true;

  constructor() {
    this.loadExpiredItems();
  }

  protected filteredExpiredItems(): DashboardInventoryAlert[] {
    return this.expiredItems.filter(
      (item) =>
        !item.consumido &&
        this.filterSidebar.matchesSearch([item.producto_nombre, item.producto_codigo_barras]) &&
        this.filterSidebar.matchesCategory(item.producto_categoria) &&
        this.filterSidebar.matchesConsumed(Boolean(item.consumido)) &&
        this.filterSidebar.matchesExpiry(this.resolveExpiryFilter(item)),
    );
  }

  protected isToggleSaving(item: InventoryCardItem): boolean {
    return this.savingConsumedIds.has(item.id_inventario);
  }

  protected toggleConsumed(item: InventoryCardItem): void {
    if (this.savingConsumedIds.has(item.id_inventario)) {
      return;
    }

    const nextConsumedValue = !Boolean(item.consumido);
    if (nextConsumedValue && !window.confirm('Este producto se marcara como consumido.')) {
      return;
    }

    this.savingConsumedIds.add(item.id_inventario);

    this.api.patch<DashboardInventoryAlert>('inventarios', item.id_inventario, { consumido: nextConsumedValue }).subscribe({
      next: (updatedItem) => {
        this.expiredItems = this.sortExpiredItems(
          this.expiredItems.map((candidate) =>
            candidate.id_inventario === item.id_inventario ? { ...candidate, ...updatedItem } : candidate,
          ),
        );
        this.filterSidebar.setAvailableCategories(this.filteredExpiredItems().map((candidate) => candidate.producto_categoria));
        this.errorMessage = '';
        this.savingConsumedIds.delete(item.id_inventario);
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar si el producto esta consumido.';
        this.savingConsumedIds.delete(item.id_inventario);
      },
    });
  }

  protected filteredExpiredCount(): number {
    return this.filteredExpiredItems().length;
  }

  protected filteredLostMoney(): string {
    const total = this.filteredExpiredItems().reduce((sum, item) => sum + this.resolveLostValue(item), 0);
    return currencyFormatter.format(total);
  }

  private loadExpiredItems(): void {
    this.loading = true;
    this.api
      .dashboardInventoryAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.expiredItems = this.sortExpiredItems(items.filter((item) => item.dias_restantes < 0 && !item.consumido));
          this.filterSidebar.setAvailableCategories(this.expiredItems.map((item) => item.producto_categoria));
          this.errorMessage = '';
          this.loading = false;
        },
        error: () => {
          this.expiredItems = [];
          this.filterSidebar.setAvailableCategories([]);
          this.errorMessage = 'No se pudieron cargar los productos caducados.';
          this.loading = false;
        },
      });
  }

  private sortExpiredItems(items: DashboardInventoryAlert[]): DashboardInventoryAlert[] {
    return [...items].sort((left, right) => {
      const dayDifference = right.dias_restantes - left.dias_restantes;
      if (dayDifference !== 0) {
        return dayDifference;
      }

      return left.producto_nombre.localeCompare(right.producto_nombre, 'es');
    });
  }

  private resolveExpiryFilter(item: DashboardInventoryAlert): ExpiryFilter {
    return item.dias_restantes < 0 ? 'expired' : 'calm';
  }

  private resolveLostValue(item: DashboardInventoryAlert): number {
    const price = this.toNumber(item.producto_precio);
    const quantity = this.toNumber(item.cantidad) ?? 1;
    return price === null ? 0 : price * Math.max(quantity, 1);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const numericValue = Number(value.replace(',', '.').trim());
      return Number.isFinite(numericValue) ? numericValue : null;
    }

    return null;
  }
}
