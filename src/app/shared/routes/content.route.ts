import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { admin, salesRoutingModule } from '../../componets/Sales/sales.route';
import { reportsRoutingModule } from '../../componets/Reports/repors.route';
import { accountingsRoutingModule } from '../../componets/accounting/accounting.route';
import { resellerRoutingModule } from '../../componets/reseller/reseller.route';


export const content: Routes = [
  {
    path: '',
    children: [
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
