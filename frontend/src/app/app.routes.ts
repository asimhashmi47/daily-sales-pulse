import { Routes } from '@angular/router';
import { DashboardPage } from './dashboard';
import { SaleFormPage } from './sale-form';
import { SalesListPage } from './sales-list';
import { SettingsPage } from './settings';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPage, title: 'Dashboard · DailySalesPulse' },
  { path: 'sales', component: SalesListPage, title: 'Sales · DailySalesPulse' },
  { path: 'sales/new', component: SaleFormPage, title: 'Add sale · DailySalesPulse' },
  { path: 'sales/:id/edit', component: SaleFormPage, title: 'Edit sale · DailySalesPulse' },
  { path: 'settings', component: SettingsPage, title: 'Settings · DailySalesPulse' },
  { path: '**', redirectTo: 'dashboard' },
];
