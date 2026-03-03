
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { admin, errorRoutingModule } from '../../componets/error/error.route';

export const authen: Routes = [
  {
    path: '',
    children: [
 
       ...errorRoutingModule.routes,
    ],
  },
];
@NgModule({
  imports: [RouterModule.forRoot(admin)],
  exports: [RouterModule],
})
export class SharedRoutingModule {}
