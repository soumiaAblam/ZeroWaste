import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  getInventoryResourceConfig,
  getProductsResourceConfig,
} from '../../../core/config/resources.config';
import { ExpiryFilter, FilterSidebarService } from '../../../core/services/filter-sidebar.service';
import { HttpApiService } from '../../../core/services/http-api.service';
import { ResourceConfig, ResourceKey } from '../../../core/types/resource.types';
import { InventoryCardComponent, InventoryCardItem } from '../../inventory/inventory-card/inventory-card.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

type CardTone = 'danger' | 'warning' | 'calm';

type InventoryRow = Record<string, unknown> & {
  id_inventario: number;
  producto_nombre: string;
  producto_categoria?: string | null;
  producto_descripcion?: string | null;
  producto_codigo_barras?: string | null;
  producto_imagen_url?: string | null;
  estado_nombre?: string | null;
  estado_color?: string | null;
  dias_restantes?: number;
  cantidad?: number | string | null;
  fecha_caducidad?: string | null;
  ubicacion?: string | null;
  consumido?: boolean | null;
};

type ProductRow = Record<string, unknown> & {
  id_producto: number;
  nombre: string;
  categoria?: string | null;
  descripcion?: string | null;
  precio?: number | string | null;
  codigo_barras?: string | null;
  imagen_url?: string | null;
};

const tonePriority: Record<CardTone, number> = {
  danger: 0,
  warning: 1,
  calm: 2,
};

const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
});

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, InventoryCardComponent, LoadingStateComponent],
  templateUrl: './resource-list.component.html',
  styleUrl: './resource-list.component.scss',
})
export class ResourceListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterSidebar = inject(FilterSidebarService);

  protected resourceKey?: ResourceKey;
  protected config?: ResourceConfig;
  protected rows: Array<Record<string, unknown>> = [];
  protected inventoryRows: InventoryRow[] = [];
  protected productRows: ProductRow[] = [];
  protected errorMessage = '';
  protected loading = false;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly savingConsumedIds = new Set<number>();

  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.resourceKey = this.resolveResourceKey(data['resourceKey']);
      this.config = this.resolveConfig(this.resourceKey);
      this.rows = [];
      this.inventoryRows = [];
      this.productRows = [];
      this.errorMessage = '';
      this.loading = Boolean(this.config);
      this.searchControl.setValue('', { emitEvent: false });
      if (this.config) {
        this.loadRows();
      }
    });
  }

  protected loadRows(): void {
    if (!this.config) {
      return;
    }

    this.loading = true;

    const endpoint = this.resolveEndpoint();
    if (!endpoint) {
      this.errorMessage = 'No se pudo identificar el tipo de recurso.';
      this.loading = false;
      return;
    }

    this.api.list<Record<string, unknown>>(endpoint, this.searchControl.value).subscribe({
      next: (rows) => {
        this.rows = rows;
        this.errorMessage = '';
        if (this.isInventoryView()) {
          this.inventoryRows = this.buildInventoryRows(rows);
          this.productRows = [];
          this.filterSidebar.setAvailableCategories(
            this.inventoryRows.filter((row) => !this.isExpired(row) && !Boolean(row.consumido)).map((row) => row.producto_categoria),
          );
        } else {
          this.productRows = this.buildProductRows(rows);
          this.inventoryRows = [];
          this.filterSidebar.setAvailableCategories(this.productRows.map((row) => row.categoria));
        }
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.inventoryRows = [];
        this.productRows = [];
        this.filterSidebar.setAvailableCategories([]);
        this.errorMessage = `No se pudo cargar ${this.config?.title.toLowerCase()}.`;
        this.loading = false;
      },
    });
  }

  protected deleteRow(row: Record<string, unknown>): void {
    if (!this.config) {
      return;
    }

    if (!window.confirm(`Se eliminara este ${this.config.singular}. Esta accion no se puede deshacer.`)) {
      return;
    }

    this.api.delete(this.config.endpoint, String(row[this.config.idField])).subscribe({
      next: () => this.loadRows(),
      error: () => {
        this.errorMessage = `No se pudo eliminar ${this.config?.singular}.`;
      },
    });
  }

  protected deleteInventoryRow(row: InventoryCardItem): void {
    this.deleteRow(row as InventoryRow);
  }

  protected isToggleSaving(row: InventoryCardItem): boolean {
    return this.savingConsumedIds.has(row.id_inventario);
  }

  protected toggleConsumed(row: InventoryCardItem): void {
    if (this.savingConsumedIds.has(row.id_inventario)) {
      return;
    }

    const nextConsumedValue = !Boolean(row.consumido);
    if (
      nextConsumedValue &&
      !window.confirm(
        'Este producto se marcara como consumido y saldra del inventario activo.',
      )
    ) {
      return;
    }

    this.savingConsumedIds.add(row.id_inventario);

    this.api.patch<InventoryRow>('inventarios', row.id_inventario, { consumido: nextConsumedValue }).subscribe({
      next: (updatedRow) => {
        // Actualizo la lista base y las tarjetas a la vez para no recargar toda la pantalla.
        this.rows = this.rows.map((candidate) =>
          candidate['id_inventario'] === row.id_inventario ? { ...candidate, ...updatedRow } : candidate,
        );
        this.inventoryRows = this.buildInventoryRows(
          this.inventoryRows.map((candidate) =>
            candidate.id_inventario === row.id_inventario ? { ...candidate, ...updatedRow } : candidate,
          ),
        );
        this.updateAvailableCategories();
        this.errorMessage = '';
        this.savingConsumedIds.delete(row.id_inventario);
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar el estado de consumo.';
        this.savingConsumedIds.delete(row.id_inventario);
      },
    });
  }

  protected isInventoryView(): boolean {
    return this.resourceKey === 'inventory';
  }

  protected isProductView(): boolean {
    return this.resourceKey === 'products';
  }

  protected filteredInventoryRows(): InventoryRow[] {
    // Los caducados y consumidos no salen aqui porque ya tienen sus secciones aparte.
    return this.inventoryRows.filter(
      (row) =>
        !this.isExpired(row) &&
        !Boolean(row.consumido) &&
        this.filterSidebar.matchesSearch([row.producto_nombre, row.producto_codigo_barras]) &&
        this.filterSidebar.matchesCategory(row.producto_categoria) &&
        this.filterSidebar.matchesConsumed(Boolean(row.consumido)) &&
        this.filterSidebar.matchesExpiry(this.resolveExpiryFilter(row)),
    );
  }

  protected filteredProductRows(): ProductRow[] {
    return this.productRows.filter(
      (row) =>
        this.filterSidebar.matchesSearch([row.nombre, row.codigo_barras]) &&
        this.filterSidebar.matchesCategory(row.categoria),
    );
  }

  protected formatShortDate(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      return 'sin fecha';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return String(value);
    }

    return shortDateFormatter.format(parsedDate);
  }

  protected formatRemainingDays(days: unknown): string {
    const numericDays = this.toNumber(days);
    if (numericDays === null) {
      return 'Sin plazo';
    }
    if (numericDays < 0) {
      return `Caducado hace ${Math.abs(numericDays)} dias`;
    }
    if (numericDays === 0) {
      return 'Caduca hoy';
    }
    if (numericDays === 1) {
      return 'Falta 1 dia';
    }

    return `Faltan ${numericDays} dias`;
  }

  protected formatCompactQuantity(value: unknown): string {
    const numericValue = this.toNumber(value);
    if (numericValue === null) {
      return '-';
    }

    return Number.isInteger(numericValue)
      ? numericValue.toLocaleString('es-ES')
      : numericValue.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }

  protected formatCurrency(value: unknown): string {
    const numericValue = this.toNumber(value);
    if (numericValue === null) {
      return 'Precio sin registrar';
    }

    return currencyFormatter.format(numericValue);
  }

  protected truncateText(value: unknown, maxLength = 84): string {
    if (typeof value !== 'string' || !value.trim()) {
      return 'Sin descripcion adicional.';
    }

    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength).trimEnd()}...`;
  }

  protected resolveInventoryTone(row: InventoryRow): CardTone {
    const color = typeof row.estado_color === 'string' ? row.estado_color.toLowerCase() : '';
    const days = this.toNumber(row.dias_restantes);

    if (color.includes('rojo') || (days !== null && days <= 2)) {
      return 'danger';
    }

    if (days !== null && days <= 6) {
      return 'warning';
    }

    return 'calm';
  }

  protected resolveToneLabel(tone: CardTone): string {
    if (tone === 'danger') {
      return 'Caduca muy pronto';
    }
    if (tone === 'warning') {
      return 'Consumir pronto';
    }

    return 'Todo bajo control';
  }

  protected resolveImageUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  protected inventoryIntroCopy(): string {
    return 'Ordenado por caducidad.';
  }

  protected productsIntroCopy(): string {
    return 'Lista de productos.';
  }

  protected resourceIntroCopy(): string {
    if (this.isInventoryView()) {
      return 'Alimentos registrados en casa.';
    }

    if (this.isProductView()) {
      return 'Productos guardados para usarlos en inventario.';
    }

    return 'Elementos guardados en esta seccion.';
  }

  private buildInventoryRows(rows: Array<Record<string, unknown>>): InventoryRow[] {
    return rows
      .map((row) => row as InventoryRow)
      .sort((left, right) => {
        const toneDifference = tonePriority[this.resolveInventoryTone(left)] - tonePriority[this.resolveInventoryTone(right)];
        if (toneDifference !== 0) {
          return toneDifference;
        }

        const dayDifference =
          (this.toNumber(left.dias_restantes) ?? Number.MAX_SAFE_INTEGER) -
          (this.toNumber(right.dias_restantes) ?? Number.MAX_SAFE_INTEGER);
        if (dayDifference !== 0) {
          return dayDifference;
        }

        return String(left.producto_nombre || '').localeCompare(String(right.producto_nombre || ''), 'es');
      });
  }

  private buildProductRows(rows: Array<Record<string, unknown>>): ProductRow[] {
    return rows
      .map((row) => row as ProductRow)
      .sort((left, right) => String(left.nombre || '').localeCompare(String(right.nombre || ''), 'es'));
  }

  private updateAvailableCategories(): void {
    if (this.isInventoryView()) {
      this.filterSidebar.setAvailableCategories(
        this.inventoryRows.filter((row) => !this.isExpired(row) && !Boolean(row.consumido)).map((row) => row.producto_categoria),
      );
      return;
    }

    this.filterSidebar.setAvailableCategories(this.productRows.map((row) => row.categoria));
  }

  private resolveExpiryFilter(row: InventoryRow): ExpiryFilter {
    const days = this.toNumber(row.dias_restantes);
    if (this.resolveInventoryTone(row) === 'danger') {
      return 'danger';
    }
    if (this.resolveInventoryTone(row) === 'warning') {
      return 'warning';
    }

    return 'calm';
  }

  private isExpired(row: InventoryRow): boolean {
    const days = this.toNumber(row.dias_restantes);
    return days !== null && days < 0;
  }

  private resolveResourceKey(value: unknown): ResourceKey | undefined {
    if (value === 'inventory' || value === 'products') {
      return value;
    }

    return undefined;
  }

  private resolveConfig(resourceKey?: ResourceKey): ResourceConfig | undefined {
    if (resourceKey === 'inventory') {
      return getInventoryResourceConfig();
    }

    if (resourceKey === 'products') {
      return getProductsResourceConfig();
    }

    return undefined;
  }

  private resolveEndpoint(): string | undefined {
    if (this.isInventoryView()) {
      return 'inventarios';
    }

    if (this.isProductView()) {
      return 'productos';
    }

    return undefined;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.replace(',', '.').trim();
      if (!normalizedValue) {
        return null;
      }

      const numericValue = Number(normalizedValue);
      return Number.isFinite(numericValue) ? numericValue : null;
    }

    return null;
  }
}
