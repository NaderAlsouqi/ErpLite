import { Routes } from '@angular/router';

export const workflowRoutes: Routes = [
  { path: 'workflow/builder', loadComponent: () => import('./workflow-builder/workflow-builder.component').then(m => m.WorkflowBuilderComponent) },
  { path: 'workflow/tasks',   loadComponent: () => import('./tasks/tasks.component').then(m => m.TasksComponent) },
];
