import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { DashboardInventoryAlert, ShoppingSuggestion } from '../types/resource.types';

@Injectable({ providedIn: 'root' })
export class HttpApiService {
  private readonly http = inject(HttpClient);

  list<T>(endpoint: string, search = ''): Observable<T[]> {
    let params = new HttpParams();
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<T[]>(`${API_BASE_URL}/${endpoint}/`, { params });
  }

  detail<T>(endpoint: string, id: string | number): Observable<T> {
    return this.http.get<T>(`${API_BASE_URL}/${endpoint}/${id}/`);
  }

  create<T>(endpoint: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${API_BASE_URL}/${endpoint}/`, payload);
  }

  update<T>(endpoint: string, id: string | number, payload: unknown): Observable<T> {
    return this.http.put<T>(`${API_BASE_URL}/${endpoint}/${id}/`, payload);
  }

  patch<T>(endpoint: string, id: string | number, payload: unknown): Observable<T> {
    return this.http.patch<T>(`${API_BASE_URL}/${endpoint}/${id}/`, payload);
  }

  delete(endpoint: string, id: string | number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/${endpoint}/${id}/`);
  }

  dashboardInventoryAlerts(): Observable<DashboardInventoryAlert[]> {
    return this.http.get<DashboardInventoryAlert[]>(`${API_BASE_URL}/inventarios/`);
  }

  shoppingSuggestions(): Observable<ShoppingSuggestion[]> {
    return this.http.get<ShoppingSuggestion[]>(`${API_BASE_URL}/listas-compra/sugerencias/`);
  }

  barcodeLookup(codigoBarras: string): Observable<{ ok: boolean; producto?: Record<string, unknown>; error?: string }> {
    const params = new HttpParams().set('codigo_barras', codigoBarras);
    return this.http.get<{ ok: boolean; producto?: Record<string, unknown>; error?: string }>(
      `${API_BASE_URL}/productos/barcode-lookup/`,
      { params },
    );
  }
}
