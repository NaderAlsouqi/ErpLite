import { registerCrudGridSuite } from './_crud-grid.suite';

registerCrudGridSuite({
  title: 'Cost Centers',
  path: '/accounting/definitions/cost-centers',
  apiResource: 'CostCenters',
  createPermission: 'CostCenters.Create',
  deletePermission: 'CostCenters.Delete',
  columnCount: 5,
});
