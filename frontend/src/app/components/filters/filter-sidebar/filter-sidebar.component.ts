import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { ConsumedFilter, ExpiryFilter, FilterSidebarService } from '../../../core/services/filter-sidebar.service';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss',
})
export class FilterSidebarComponent {
  protected readonly filterService = inject(FilterSidebarService);
  protected readonly consumedOptions: Array<{ label: string; value: ConsumedFilter }> = [
    { label: 'Consumido', value: 'consumed' },
    { label: 'No consumido', value: 'not-consumed' },
  ];
  protected readonly expiryOptions: Array<{ label: string; value: ExpiryFilter }> = [
    { label: 'Caduca muy pronto', value: 'danger' },
    { label: 'Consumir pronto', value: 'warning' },
    { label: 'Todo bajo control', value: 'calm' },
  ];

  protected updateSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterService.setSearchTerm(input.value);
  }
}
