import { Routes } from '@angular/router';

import { authGuard, publicOnlyGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./components/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./components/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./components/user/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'inventory',
        data: { resourceKey: 'inventory' },
        loadComponent: () =>
          import('./components/resources/resource-list/resource-list.component').then((m) => m.ResourceListComponent),
      },
      {
        path: 'inventory/new',
        data: { resourceKey: 'inventory' },
        loadComponent: () =>
          import('./components/resources/resource-form/resource-form.component').then((m) => m.ResourceFormComponent),
      },
      {
        path: 'inventory/:id',
        data: { resourceKey: 'inventory' },
        loadComponent: () =>
          import('./components/resources/resource-detail/resource-detail.component').then((m) => m.ResourceDetailComponent),
      },
      {
        path: 'inventory/:id/edit',
        data: { resourceKey: 'inventory' },
        loadComponent: () =>
          import('./components/resources/resource-form/resource-form.component').then((m) => m.ResourceFormComponent),
      },
      {
        path: 'products',
        data: { resourceKey: 'products' },
        loadComponent: () =>
          import('./components/resources/resource-list/resource-list.component').then((m) => m.ResourceListComponent),
      },
      {
        path: 'products/new',
        data: { resourceKey: 'products' },
        loadComponent: () =>
          import('./components/resources/resource-form/resource-form.component').then((m) => m.ResourceFormComponent),
      },
      {
        path: 'products/:id',
        data: { resourceKey: 'products' },
        loadComponent: () =>
          import('./components/resources/resource-detail/resource-detail.component').then((m) => m.ResourceDetailComponent),
      },
      {
        path: 'products/:id/edit',
        data: { resourceKey: 'products' },
        loadComponent: () =>
          import('./components/resources/resource-form/resource-form.component').then((m) => m.ResourceFormComponent),
      },
      {
        path: 'recipes',
        loadComponent: () =>
          import('./components/recipes/recipe-planner/recipe-planner.component').then((m) => m.RecipePlannerComponent),
      },
      {
        path: 'waste',
        loadComponent: () => import('./components/waste/waste/waste.component').then((m) => m.WasteComponent),
      },
      {
        path: 'shopping-list',
        loadComponent: () =>
          import('./components/shopping-list/shopping-list/shopping-list.component').then((m) => m.ShoppingListComponent),
      },
      {
        path: 'statistics',
        loadComponent: () =>
          import('./components/statistics/statistics/statistics.component').then((m) => m.StatisticsComponent),
      },
      {
        path: 'nosotros',
        loadComponent: () => import('./components/about/about.component').then((m) => m.AboutComponent),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/shared/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
