import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

import { HttpApiService } from '../../../core/services/http-api.service';
import { DashboardInventoryAlert } from '../../../core/types/resource.types';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

@Component({
  selector: 'app-recipe-planner',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoadingStateComponent],
  templateUrl: './recipe-planner.component.html',
  styleUrl: './recipe-planner.component.scss',
})
export class RecipePlannerComponent {
  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectedIds = new Set<number>();

  protected urgentProducts: DashboardInventoryAlert[] = [];
  protected errorMessage = '';
  protected loading = true;

  constructor() {
    this.loadUrgentProducts();
  }

  protected selectedCount(): number {
    return this.selectedIds.size;
  }

  protected isSelected(item: DashboardInventoryAlert): boolean {
    return this.selectedIds.has(item.id_inventario);
  }

  protected toggleSelection(item: DashboardInventoryAlert): void {
    if (this.selectedIds.has(item.id_inventario)) {
      this.selectedIds.delete(item.id_inventario);
      return;
    }

    this.selectedIds.add(item.id_inventario);
  }

  protected resolveTone(item: DashboardInventoryAlert): 'danger' | 'warning' {
    const color = (item.estado_color || '').toLowerCase();
    return color.includes('rojo') || item.dias_restantes <= 2 ? 'danger' : 'warning';
  }

  protected formatRemainingDays(days: number): string {
    if (days === 0) {
      return 'Hoy';
    }
    if (days === 1) {
      return '1 dia';
    }

    return `${days} dias`;
  }

  private loadUrgentProducts(): void {
    this.loading = true;
    this.api
      .dashboardInventoryAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.urgentProducts = this.sortProducts(
            items.filter((item) => item.estado_dias_aviso !== null && item.dias_restantes >= 0 && !item.consumido),
          );
          this.errorMessage = '';
          this.loading = false;
        },
        error: () => {
          this.urgentProducts = [];
          this.errorMessage = 'No se pudieron cargar los productos proximos a caducar.';
          this.loading = false;
        },
      });
  }

  private sortProducts(items: DashboardInventoryAlert[]): DashboardInventoryAlert[] {
    return [...items].sort((left, right) => {
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
}
