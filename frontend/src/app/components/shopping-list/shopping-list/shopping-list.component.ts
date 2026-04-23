import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

import { FilterSidebarService } from '../../../core/services/filter-sidebar.service';
import { HttpApiService } from '../../../core/services/http-api.service';
import { ShoppingSuggestion } from '../../../core/types/resource.types';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoadingStateComponent],
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.scss',
})
export class ShoppingListComponent {
  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterSidebar = inject(FilterSidebarService);

  protected suggestions: ShoppingSuggestion[] = [];
  protected loading = true;
  protected errorMessage = '';

  constructor() {
    this.loadSuggestions();
  }

  protected loadSuggestions(): void {
    this.loading = true;
    this.api
      .shoppingSuggestions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (suggestions) => {
          this.suggestions = suggestions;
          this.filterSidebar.setAvailableCategories(suggestions.map((suggestion) => suggestion.producto_categoria));
          this.errorMessage = '';
          this.loading = false;
        },
        error: () => {
          this.filterSidebar.setAvailableCategories([]);
          this.errorMessage = 'No se pudieron cargar las sugerencias de compra.';
          this.loading = false;
        },
      });
  }

  protected filteredSuggestions(): ShoppingSuggestion[] {
    return this.suggestions.filter(
      (suggestion) =>
        this.filterSidebar.matchesSearch([suggestion.producto_nombre, suggestion.producto_codigo_barras]) &&
        this.filterSidebar.matchesCategory(suggestion.producto_categoria),
    );
  }

  protected formatCompactQuantity(value: number | string): string {
    const numericValue = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    if (!Number.isFinite(numericValue)) {
      return String(value || '-');
    }

    return Number.isInteger(numericValue)
      ? numericValue.toLocaleString('es-ES')
      : numericValue.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }

  protected resolveImageUrl(value: string | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  protected formatReasons(reasons: string[]): string {
    return reasons.length ? reasons.join(' + ') : 'Sugerido';
  }

  protected reasonTone(reasons: string[]): 'consumed' | 'expired' | 'suggested' {
    if (reasons.includes('Consumido')) {
      return 'consumed';
    }
    if (reasons.includes('Caducado')) {
      return 'expired';
    }

    return 'suggested';
  }
}
