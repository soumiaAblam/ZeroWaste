import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

import { HttpApiService } from '../../../core/services/http-api.service';
import { DashboardInventoryAlert } from '../../../core/types/resource.types';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

type StatisticsMode = 'year' | 'years' | 'month';

interface WasteStatItem extends DashboardInventoryAlert {
  lostValue: number;
  month: number;
  year: number;
}

interface PeriodSummary {
  count: number;
  money: number;
}

const monthLabels = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

Chart.register(CategoryScale, LinearScale, BarController, BarElement, LineController, LineElement, PointElement, Tooltip, Legend);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss',
})
export class StatisticsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wasteChart') private chartCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly api = inject(HttpApiService);
  private readonly destroyRef = inject(DestroyRef);
  private chart?: Chart;
  private chartReady = false;

  protected readonly months = monthLabels;
  protected mode: StatisticsMode = 'year';
  protected selectedYear = new Date().getFullYear();
  protected selectedMonth = new Date().getMonth();
  protected wasteItems: WasteStatItem[] = [];
  protected errorMessage = '';
  protected loading = true;

  constructor() {
    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.chartReady = true;
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  protected availableYears(): number[] {
    const years = new Set<number>([new Date().getFullYear(), ...this.wasteItems.map((item) => item.year)]);
    return Array.from(years).sort((left, right) => left - right);
  }

  protected setMode(mode: StatisticsMode): void {
    this.mode = mode;
    this.renderChart();
  }

  protected updateSelectedYear(event: Event): void {
    this.selectedYear = Number((event.target as HTMLSelectElement).value);
    this.renderChart();
  }

  protected updateSelectedMonth(event: Event): void {
    this.selectedMonth = Number((event.target as HTMLSelectElement).value);
    this.mode = 'month';
    this.renderChart();
  }

  protected yearSummary(): PeriodSummary {
    return this.summarize(this.itemsForYear(this.selectedYear));
  }

  protected selectedMonthLabel(): string {
    return `${monthLabels[this.selectedMonth]} ${this.selectedYear}`;
  }

  protected formatMoney(value: number): string {
    return currencyFormatter.format(value);
  }

  private loadStats(): void {
    this.loading = true;
    this.api
      .dashboardInventoryAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.wasteItems = items
            .filter((item) => item.dias_restantes < 0)
            .map((item) => this.toWasteStatItem(item))
            .filter((item): item is WasteStatItem => item !== null);
          this.selectedYear = this.latestAvailableYear();
          this.mode = 'year';
          this.errorMessage = '';
          this.loading = false;
          // Lo dejo asi porque el canvas a veces no esta listo al terminar la carga.
          setTimeout(() => this.renderChart());
        },
        error: () => {
          this.wasteItems = [];
          this.errorMessage = 'No se pudieron cargar las estadisticas de desperdicio.';
          this.loading = false;
          setTimeout(() => this.renderChart());
        },
      });
  }

  private renderChart(): void {
    if (!this.chartReady || !this.chartCanvas) {
      return;
    }

    this.chart?.destroy();
    this.chart = new Chart(this.chartCanvas.nativeElement, this.buildChartConfig());
  }

  private buildChartConfig(): ChartConfiguration<'bar' | 'line'> {
    const labels = this.resolveChartLabels();
    const counts = this.resolveChartCounts();
    const money = this.resolveChartMoney();

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Productos desperdiciados',
            data: counts,
            backgroundColor: 'rgba(223, 79, 47, 0.82)',
            borderRadius: 5,
            yAxisID: 'products',
          },
          {
            type: 'line',
            label: 'Dinero perdido',
            data: money,
            borderColor: '#4d912e',
            backgroundColor: 'rgba(77, 145, 46, 0.16)',
            pointBackgroundColor: '#4d912e',
            pointRadius: 4,
            tension: 0.32,
            yAxisID: 'money',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        onClick: (_event, elements) => {
          if (this.mode !== 'year' || !elements.length) {
            return;
          }

          // Si hacen click en una barra del resumen anual, bajo al detalle de ese mes.
          this.selectedMonth = elements[0].index;
          this.mode = 'month';
          setTimeout(() => this.renderChart());
        },
        plugins: {
          legend: {
            labels: {
              boxWidth: 12,
              color: '#4b5563',
              font: { family: 'Manrope', weight: 800 },
            },
          },
          tooltip: {
            callbacks: {
              label: (item) =>
                item.dataset.yAxisID === 'money'
                  ? `Dinero perdido: ${this.formatMoney(Number(item.raw || 0))}`
                  : `Productos desperdiciados: ${item.raw}`,
            },
          },
        },
        scales: {
          products: {
            beginAtZero: true,
            position: 'left',
            ticks: { precision: 0, color: '#6b7280' },
            grid: { color: 'rgba(107, 114, 128, 0.12)' },
          },
          money: {
            beginAtZero: true,
            position: 'right',
            ticks: {
              color: '#6b7280',
              callback: (value) => currencyFormatter.format(Number(value)),
            },
            grid: { drawOnChartArea: false },
          },
          x: {
            ticks: { color: '#6b7280' },
            grid: { display: false },
          },
        },
      },
    };
  }

  private resolveChartLabels(): string[] {
    if (this.mode === 'years') {
      return this.availableYears().map(String);
    }

    if (this.mode === 'month') {
      return this.itemsForMonth(this.selectedYear, this.selectedMonth).map((item) => item.producto_nombre);
    }

    return monthLabels.map((label) => label.slice(0, 3));
  }

  private resolveChartCounts(): number[] {
    if (this.mode === 'years') {
      return this.availableYears().map((year) => this.itemsForYear(year).length);
    }

    if (this.mode === 'month') {
      return this.itemsForMonth(this.selectedYear, this.selectedMonth).map(() => 1);
    }

    return monthLabels.map((_, month) => this.itemsForMonth(this.selectedYear, month).length);
  }

  private resolveChartMoney(): number[] {
    if (this.mode === 'years') {
      return this.availableYears().map((year) => this.summarize(this.itemsForYear(year)).money);
    }

    if (this.mode === 'month') {
      return this.itemsForMonth(this.selectedYear, this.selectedMonth).map((item) => item.lostValue);
    }

    return monthLabels.map((_, month) => this.summarize(this.itemsForMonth(this.selectedYear, month)).money);
  }

  private itemsForYear(year: number): WasteStatItem[] {
    return this.wasteItems.filter((item) => item.year === year);
  }

  private latestAvailableYear(): number {
    if (!this.wasteItems.length) {
      return new Date().getFullYear();
    }

    return Math.max(...this.wasteItems.map((item) => item.year));
  }

  private itemsForMonth(year: number, month: number): WasteStatItem[] {
    return this.wasteItems.filter((item) => item.year === year && item.month === month);
  }

  private summarize(items: WasteStatItem[]): PeriodSummary {
    return {
      count: items.length,
      money: items.reduce((sum, item) => sum + item.lostValue, 0),
    };
  }

  private toWasteStatItem(item: DashboardInventoryAlert): WasteStatItem | null {
    const parsedDate = new Date(item.fecha_caducidad);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const price = this.toNumber(item.producto_precio);
    const quantity = this.toNumber(item.cantidad) ?? 1;

    return {
      ...item,
      lostValue: price === null ? 0 : price * Math.max(quantity, 1),
      month: parsedDate.getMonth(),
      year: parsedDate.getFullYear(),
    };
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
