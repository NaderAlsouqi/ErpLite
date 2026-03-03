import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const admin: Routes = [
  {
    path: 'reseller', children: [
      {
        path: 'notes',
        loadComponent: () => import('./notes/notes.component').then(m => m.NotesComponent)
      },
      {
        path: 'quotation',
        loadComponent: () => import('./quotation/quotation.component').then(m => m.QuotationComponent)
      }
    ]
  }
];
@NgModule({
  imports: [RouterModule.forChild(admin)],
  exports: [RouterModule],
})
export class resellerRoutingModule {
  static routes = admin;
}