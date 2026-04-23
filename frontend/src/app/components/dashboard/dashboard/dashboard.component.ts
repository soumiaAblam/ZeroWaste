import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { InventoryAlertsComponent } from '../inventory-alerts/inventory-alerts.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, InventoryAlertsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {}
