import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

export type InventoryCardTone = 'expired' | 'danger' | 'warning' | 'calm';

export interface InventoryCardItem {
  id_inventario: number;
  producto_nombre: string;
  producto_categoria?: string | null;
  producto_codigo_barras?: string | null;
  producto_precio?: number | string | null;
  producto_imagen_url?: string | null;
  estado_nombre?: string | null;
  estado_color?: string | null;
  dias_restantes?: number | null;
  cantidad?: number | string | null;
  fecha_caducidad?: string | null;
  ubicacion?: string | null;
  consumido?: boolean | null;
}

const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
});

@Component({
  selector: 'app-inventory-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './inventory-card.component.html',
  styleUrl: './inventory-card.component.scss',
})
export class InventoryCardComponent {
  @Input({ required: true }) item!: InventoryCardItem;
  @Input() showDelete = false;
  @Input() showActions = true;
  @Input() compactExpired = false;
  @Input() saving = false;

  @Output() toggleConsumed = new EventEmitter<InventoryCardItem>();
  @Output() deleteRequested = new EventEmitter<InventoryCardItem>();

  protected resolveTone(): InventoryCardTone {
    const color = typeof this.item.estado_color === 'string' ? this.item.estado_color.toLowerCase() : '';
    const days = this.toNumber(this.item.dias_restantes);

    if (color.includes('gris') || (days !== null && days < 0)) {
      return 'expired';
    }

    if (color.includes('rojo') || (days !== null && days <= 2)) {
      return 'danger';
    }

    if (days !== null && days <= 6) {
      return 'warning';
    }

    return 'calm';
  }

  protected resolveToneLabel(): string {
    const tone = this.resolveTone();
    if (tone === 'expired') {
      return 'Caducado';
    }
    if (tone === 'danger') {
      return 'Caduca muy pronto';
    }
    if (tone === 'warning') {
      return 'Consumir pronto';
    }

    return 'Todo bajo control';
  }

  protected resolveStatusLabel(): string {
    if (this.resolveTone() === 'expired') {
      return 'Caducado';
    }

    return this.item.estado_nombre || this.resolveToneLabel();
  }

  protected formatRemainingDays(): string {
    const numericDays = this.toNumber(this.item.dias_restantes);
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

  protected formatExpiredSummary(): string {
    const numericDays = this.toNumber(this.item.dias_restantes);
    const formattedDate = this.formatShortDate();

    if (numericDays === null || numericDays >= 0) {
      return `Caduca ${formattedDate}`;
    }

    const daysAgo = Math.abs(numericDays);
    return `${formattedDate} - hace ${daysAgo} ${daysAgo === 1 ? 'dia' : 'dias'}`;
  }

  protected formatShortDate(): string {
    const value = this.item.fecha_caducidad;
    if (typeof value !== 'string' || !value.trim()) {
      return 'sin fecha';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return shortDateFormatter.format(parsedDate);
  }

  protected formatCompactQuantity(): string {
    const numericValue = this.toNumber(this.item.cantidad);
    if (numericValue === null) {
      return '-';
    }

    return Number.isInteger(numericValue)
      ? numericValue.toLocaleString('es-ES')
      : numericValue.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }

  protected resolveImageUrl(): string | null {
    if (typeof this.item.producto_imagen_url !== 'string') {
      return null;
    }

    const trimmedValue = this.item.producto_imagen_url.trim();
    return trimmedValue ? trimmedValue : null;
  }

  protected isConsumed(): boolean {
    return Boolean(this.item.consumido);
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
