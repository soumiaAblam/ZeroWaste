import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';

import {
  getInventoryResourceConfig,
  getProductsResourceConfig,
} from '../../../core/config/resources.config';
import { HttpApiService } from '../../../core/services/http-api.service';
import { ResourceConfig, ResourceKey } from '../../../core/types/resource.types';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

@Component({
  selector: 'app-resource-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingStateComponent],
  templateUrl: './resource-detail.component.html',
  styleUrl: './resource-detail.component.scss',
})
export class ResourceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected resourceKey?: ResourceKey;
  protected config?: ResourceConfig;
  protected record?: Record<string, unknown>;
  protected errorMessage = '';
  protected loading = false;

  constructor() {
    combineLatest([this.route.data, this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([data, params]) => {
        this.resourceKey = this.resolveResourceKey(data['resourceKey']);
        this.config = this.resolveConfig(this.resourceKey);
        const id = params.get('id');
        this.record = undefined;
        this.errorMessage = '';
        this.loading = Boolean(this.config && id);

        if (!this.config || !id) {
          this.loading = false;
          return;
        }

        this.api.detail<Record<string, unknown>>(this.config.endpoint, id).subscribe({
          next: (record) => {
            this.record = record;
            this.errorMessage = '';
            this.loading = false;
          },
          error: () => {
            this.errorMessage = `No se pudo cargar ${this.config?.singular}.`;
            this.loading = false;
          },
        });
      });
  }

  protected deleteRecord(): void {
    if (!this.config || !this.record) {
      return;
    }

    if (!window.confirm(`Se eliminara este ${this.config.singular}. Esta accion no se puede deshacer.`)) {
      return;
    }

    this.api.delete(this.config.endpoint, String(this.record[this.config.idField])).subscribe({
      next: async () => {
        await this.router.navigate(['/', this.config?.key]);
      },
      error: () => {
        this.errorMessage = `No se pudo eliminar ${this.config?.singular}.`;
      },
    });
  }

  protected formatValue(value: unknown): string {
    if (value === true) {
      return 'Si';
    }
    if (value === false) {
      return 'No';
    }
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
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
}
