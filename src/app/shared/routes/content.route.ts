import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { admin, salesRoutingModule } from '../../componets/Sales/sales.route';
import { reportsRoutingModule } from '../../componets/Reports/repors.route';
import { accountingsRoutingModule } from '../../componets/accounting/accounting.route';
import { resellerRoutingModule } from '../../componets/reseller/reseller.route';
import { dashboardRoutes } from '../../componets/dashboard/dashboard.route';
import { dashboard2Routes } from '../../componets/dashboard2/dashboard2.route';
import { activityLogRoutes } from '../../componets/activity-log/activity-log.route';
import { homeRoutes } from '../../componets/home/home.route';


export const content: Routes = [
  {
    path: '',
    children: [
      ...homeRoutes,
      ...dashboardRoutes,
      ...dashboard2Routes,
      ...activityLogRoutes,
      ...salesRoutingModule.routes,
      ...reportsRoutingModule.routes,
      ...accountingsRoutingModule.routes,
      ...resellerRoutingModule.routes
    ],
  },
];
@NgModule({
  imports: [RouterModule.forRoot(admin)],
  exports: [RouterModule],
})
export class SharedRoutingModule {}
