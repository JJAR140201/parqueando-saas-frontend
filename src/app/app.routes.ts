import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { MainLayoutComponent } from './features/layout/main-layout.component';
import { MensualidadesPageComponent } from './features/mensualidades/mensualidades.page.component';
import { OperatorDashboardPageComponent } from './features/operator/operator-dashboard.page.component';
import { ParkingReportsPageComponent } from './features/reports/parking-reports.page.component';
import { CompanyManagementPageComponent } from './features/super-admin/company-management.page.component';
import { UserManagementPageComponent } from './features/users/user-management.page.component';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginPageComponent
	},
	{
		path: 'app',
		component: MainLayoutComponent,
		canActivate: [authGuard],
		children: [
			{
				path: 'empresas',
				component: CompanyManagementPageComponent,
				canActivate: [roleGuard],
				data: { roles: ['SUPER_ADMIN'] }
			},
			{
				path: 'usuarios',
				component: UserManagementPageComponent,
				canActivate: [roleGuard],
				data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
			},
			{
				path: 'operaciones',
				component: OperatorDashboardPageComponent,
				canActivate: [roleGuard],
				data: { roles: ['SUPER_ADMIN', 'ADMIN', 'OPERARIO'] }
			},
			{
				path: 'mensualidades',
				component: MensualidadesPageComponent,
				canActivate: [roleGuard],
				data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
			},
			{
				path: 'reportes',
				component: ParkingReportsPageComponent,
				canActivate: [roleGuard],
				data: { roles: ['SUPER_ADMIN', 'ADMIN', 'OPERARIO'] }
			},
			{
				path: '',
				redirectTo: 'operaciones',
				pathMatch: 'full'
			}
		]
	},
	{
		path: '',
		redirectTo: '/login',
		pathMatch: 'full'
	},
	{
		path: '**',
		redirectTo: '/login'
	}
];
