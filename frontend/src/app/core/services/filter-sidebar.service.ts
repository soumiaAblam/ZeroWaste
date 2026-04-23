import { Injectable, computed, signal } from '@angular/core';

export type ConsumedFilter = 'consumed' | 'not-consumed';
export type ExpiryFilter = 'expired' | 'danger' | 'warning' | 'calm';

@Injectable({ providedIn: 'root' })
export class FilterSidebarService {
  readonly searchTerm = signal('');
  readonly selectedCategories = signal<string[]>([]);
  readonly selectedConsumed = signal<ConsumedFilter[]>([]);
  readonly selectedExpiry = signal<ExpiryFilter[]>([]);
  readonly availableCategories = signal<string[]>([]);

  readonly hasActiveFilters = computed(
    () =>
      Boolean(this.searchTerm().trim()) ||
      this.selectedCategories().length > 0 ||
      this.selectedConsumed().length > 0 ||
      this.selectedExpiry().length > 0,
  );

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setAvailableCategories(categories: Array<string | null | undefined>): void {
    const uniqueCategories = Array.from(
      new Set(categories.map((category) => String(category || '').trim()).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right, 'es'));

    this.availableCategories.set(uniqueCategories);
    this.selectedCategories.update((selectedCategories) =>
      selectedCategories.filter((category) => uniqueCategories.includes(category)),
    );
  }

  clearAvailableCategories(): void {
    this.availableCategories.set([]);
    this.selectedCategories.set([]);
  }

  toggleCategory(category: string): void {
    this.toggleStringValue(this.selectedCategories, category);
  }

  toggleConsumed(value: ConsumedFilter): void {
    this.toggleStringValue(this.selectedConsumed, value);
  }

  toggleExpiry(value: ExpiryFilter): void {
    this.toggleStringValue(this.selectedExpiry, value);
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories().includes(category);
  }

  isConsumedSelected(value: ConsumedFilter): boolean {
    return this.selectedConsumed().includes(value);
  }

  isExpirySelected(value: ExpiryFilter): boolean {
    return this.selectedExpiry().includes(value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategories.set([]);
    this.selectedConsumed.set([]);
    this.selectedExpiry.set([]);
  }

  matchesSearch(searchableValues: unknown[]): boolean {
    const normalizedSearch = this.normalize(this.searchTerm());
    if (!normalizedSearch) {
      return true;
    }

    return searchableValues.some((value) => this.normalize(value).includes(normalizedSearch));
  }

  matchesCategory(category: unknown): boolean {
    const selectedCategories = this.selectedCategories();
    if (!selectedCategories.length) {
      return true;
    }

    return selectedCategories.includes(String(category || '').trim());
  }

  matchesConsumed(isConsumed: boolean | null | undefined): boolean {
    const selectedConsumed = this.selectedConsumed();
    if (!selectedConsumed.length) {
      return true;
    }

    return selectedConsumed.includes(isConsumed ? 'consumed' : 'not-consumed');
  }

  matchesExpiry(expiry: ExpiryFilter | null): boolean {
    const selectedExpiry = this.selectedExpiry();
    if (!selectedExpiry.length || expiry === null) {
      return true;
    }

    return selectedExpiry.includes(expiry);
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private toggleStringValue<T extends string>(
    source: { update: (callback: (values: T[]) => T[]) => void },
    value: T,
  ): void {
    source.update((values) => (values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value]));
  }
}
