import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { AdminEvents } from './components/admin-events/admin-events';
import { AdminStand } from './components/admin-stand/admin-stand';
import { Moderation } from './components/moderation/moderation';
import { adminGuard, authGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: 'admin/events',
    component: AdminEvents,
    canActivate: [adminGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/stands',
    component: AdminStand,
    canActivate: [adminGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_STAND_OWNER'] },
  },
  {
    path: 'admin/moderation',
    component: Moderation,
    canActivate: [adminGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MODERATOR'] },
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' },
];
