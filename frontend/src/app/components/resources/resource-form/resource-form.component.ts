import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, forkJoin, map, of } from 'rxjs';

import {
  getInventoryResourceConfig,
  getProductsResourceConfig,
} from '../../../core/config/resources.config';
import { HttpApiService } from '../../../core/services/http-api.service';
import { ResourceConfig, ResourceFieldConfig, ResourceKey } from '../../../core/types/resource.types';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

type SelectOption = { label: string; value: number | string };
type BarcodeDetectorCtor = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
};

function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return Number.isInteger(Number(value)) ? null : { integer: true };
}

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingStateComponent],
  templateUrl: './resource-form.component.html',
  styleUrl: './resource-form.component.scss',
})
export class ResourceFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('scannerVideo') private scannerVideoRef?: ElementRef<HTMLVideoElement>;

  protected resourceKey?: ResourceKey;
  protected config?: ResourceConfig;
  protected form = new FormGroup<Record<string, FormControl>>({});
  protected isEdit = false;
  protected currentId = '';
  protected selectOptions: Record<string, SelectOption[]> = {};
  protected errorMessage = '';
  protected submitting = false;
  protected loading = false;
  protected scannerMessage = 'Camara detenida.';
  protected scannerRunning = false;

  private mediaStream?: MediaStream;
  private detector?: InstanceType<BarcodeDetectorCtor>;
  private animationFrameId?: number;
  private lastDetectedCode = '';

  constructor() {
    this.destroyRef.onDestroy(() => this.stopScanner());

    combineLatest([this.route.data, this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([data, params]) => {
        this.resourceKey = this.resolveResourceKey(data['resourceKey']);
        this.config = this.resolveConfig(this.resourceKey);
        this.isEdit = Boolean(params.get('id'));
        this.currentId = params.get('id') || '';
        this.selectOptions = {};
        this.errorMessage = '';
        this.loading = Boolean(this.config);

        if (!this.config) {
          return;
        }

        this.form = this.buildForm(this.config, this.isEdit);
        this.loadFormDependencies();
      });
  }

  protected getOptions(fieldKey: string): SelectOption[] {
    return this.selectOptions[fieldKey] || [];
  }

  protected isInventoryForm(): boolean {
    return this.resourceKey === 'inventory';
  }

  protected isProductsForm(): boolean {
    return this.resourceKey === 'products';
  }

  protected hasFieldError(fieldKey: string): boolean {
    const control = this.form.get(fieldKey);
    return Boolean(control && control.touched && control.invalid);
  }

  protected hasIntegerError(fieldKey: string): boolean {
    const control = this.form.get(fieldKey);
    return Boolean(control && control.touched && control.hasError('integer'));
  }

  protected submit(): void {
    if (!this.config || this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    const request$ = this.isEdit
      ? this.api.update<Record<string, unknown>>(this.config.endpoint, this.currentId, payload)
      : this.api.create<Record<string, unknown>>(this.config.endpoint, payload);

    this.submitting = true;

    request$.subscribe({
      next: async (record) => {
        const targetId = String(record[this.config!.idField]);
        this.submitting = false;
        await this.router.navigate(['/', this.config!.key, targetId]);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.resolveErrorMessage(error);
        this.submitting = false;
      },
    });
  }

  protected lookupBarcode(): void {
    const barcode = String(this.form.get('codigo_barras')?.value || '').trim();
    if (!barcode) {
      this.scannerMessage = 'Escribe un codigo primero.';
      return;
    }

    this.scannerMessage = 'Buscando producto...';

    this.api.barcodeLookup(barcode).subscribe({
      next: (response) => {
        if (!response.ok || !response.producto) {
          this.scannerMessage = response.error || 'No se encontraron datos.';
          return;
        }

        this.fillProductFields(response.producto);
        this.scannerMessage = 'Datos completados.';
      },
      error: () => {
        this.scannerMessage = 'No se pudo buscar el producto.';
      },
    });
  }

  protected async startScanner(): Promise<void> {
    if (this.scannerRunning) {
      return;
    }

    const BarcodeDetectorClass = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!BarcodeDetectorClass) {
      this.scannerMessage = 'Este navegador no permite escanear. Escribe el codigo manualmente.';
      return;
    }

    try {
      this.detector = new BarcodeDetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      const video = this.scannerVideoRef?.nativeElement;
      if (!video) {
        this.scannerMessage = 'No se pudo abrir la vista de la camara.';
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = undefined;
        return;
      }

      this.scannerRunning = true;
      video.srcObject = this.mediaStream;
      await video.play();
      this.lastDetectedCode = '';
      this.scannerMessage = 'Escaner activo.';
      this.scanLoop();
    } catch {
      this.scannerMessage = 'No se pudo abrir la camara.';
      this.stopScanner();
    }
  }

  protected stopScanner(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = undefined;
    }

    const video = this.scannerVideoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }

    this.scannerRunning = false;
    this.scannerMessage = 'Camara detenida.';
  }

  private loadFormDependencies(): void {
    if (!this.config) {
      return;
    }

    const optionRequests = this.isInventoryForm() ? this.loadInventorySelectOptions() : of({});

    const record$ =
      this.isEdit && this.currentId
        ? this.api.detail<Record<string, unknown>>(this.config.endpoint, this.currentId)
        : of<Record<string, unknown> | null>(null);

    forkJoin({ options: optionRequests, record: record$ }).subscribe({
      next: ({ options, record }) => {
        this.selectOptions = options as Record<string, SelectOption[]>;
        if (record) {
          this.patchRecord(record);
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los datos del formulario.';
        this.loading = false;
      },
    });
  }

  private buildForm(config: ResourceConfig, isEdit: boolean): FormGroup<Record<string, FormControl>> {
    const controls: Record<string, FormControl> = {};

    for (const field of config.formFields) {
      const validators = [];
      const required = isEdit ? field.requiredOnEdit : field.requiredOnCreate;
      if (required) {
        validators.push(Validators.required);
      }
      if (field.integer) {
        validators.push(integerValidator);
      }

      const initialValue = field.type === 'checkbox' ? false : '';
      controls[field.key] = new FormControl(initialValue, validators);
    }

    return new FormGroup(controls);
  }

  private patchRecord(record: Record<string, unknown>): void {
    if (!this.config) {
      return;
    }

    for (const field of this.config.formFields) {
      const value = record[field.key];
      this.form.get(field.key)?.setValue(this.toInputValue(value, field));
    }
  }

  private toInputValue(value: unknown, field: ResourceFieldConfig): unknown {
    if (field.type === 'checkbox') {
      return Boolean(value);
    }

    if (value === null || value === undefined) {
      return '';
    }

    if (field.type === 'date') {
      return String(value).slice(0, 10);
    }

    if (field.type === 'datetime-local') {
      return String(value).slice(0, 16);
    }

    return value;
  }

  private toPayload(): Record<string, unknown> {
    if (!this.config) {
      return {};
    }

    if (this.isInventoryForm()) {
      return this.buildInventoryPayload();
    }

    if (this.isProductsForm()) {
      return this.buildProductsPayload();
    }

    return {};
  }

  private buildInventoryPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const field of this.config!.formFields) {
      const rawValue = this.form.get(field.key)?.value;

      if (field.type === 'number' || field.type === 'select') {
        payload[field.key] = rawValue === '' ? null : Number(rawValue);
        continue;
      }

      if (field.type === 'date' || field.type === 'datetime-local') {
        payload[field.key] = rawValue === '' ? null : rawValue;
        continue;
      }

      payload[field.key] = rawValue === '' ? null : rawValue;
    }

    return payload;
  }

  private buildProductsPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const field of this.config!.formFields) {
      const rawValue = this.form.get(field.key)?.value;

      if (field.type === 'number') {
        payload[field.key] = rawValue === '' ? null : Number(rawValue);
        continue;
      }

      payload[field.key] = rawValue === '' ? null : rawValue;
    }

    return payload;
  }

  private fillProductFields(producto: Record<string, unknown>): void {
    const nombre = this.form.get('nombre');
    const categoria = this.form.get('categoria');
    const descripcion = this.form.get('descripcion');

    if (nombre && !String(nombre.value || '').trim() && producto['nombre']) {
      nombre.setValue(String(producto['nombre']));
    }

    if (categoria && !String(categoria.value || '').trim() && producto['categoria']) {
      categoria.setValue(String(producto['categoria']));
    }

    if (descripcion && !String(descripcion.value || '').trim() && producto['descripcion']) {
      descripcion.setValue(String(producto['descripcion']));
    }
  }

  private async scanLoop(): Promise<void> {
    const video = this.scannerVideoRef?.nativeElement;
    if (!video || !this.detector) {
      return;
    }

    try {
      if (video.videoWidth > 0) {
        const barcodes = await this.detector.detect(video);
        if (barcodes.length > 0) {
          const code = (barcodes[0].rawValue || '').trim();
          if (code && code !== this.lastDetectedCode) {
            this.lastDetectedCode = code;
            this.form.get('codigo_barras')?.setValue(code);
            this.stopScanner();
            this.lookupBarcode();
            return;
          }
        }
      }
    } catch {
      this.scannerMessage = 'No se pudo leer el codigo.';
    }

    this.animationFrameId = requestAnimationFrame(() => {
      void this.scanLoop();
    });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }

    if (error.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error)[0];
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
        return firstValue[0];
      }
      if (typeof firstValue === 'string') {
        return firstValue;
      }
    }

    return 'No se pudo guardar el registro.';
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

  private loadInventorySelectOptions() {
    return forkJoin({
      producto: this.api.list<Record<string, unknown>>('productos').pipe(
        map((items) =>
          items.map((item) => ({
            label: String(item['nombre']),
            value: Number(item['id_producto']),
          })),
        ),
      ),
    });
  }
}
