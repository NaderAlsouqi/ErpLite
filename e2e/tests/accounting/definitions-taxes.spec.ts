import { registerCrudGridSuite } from './_crud-grid.suite';

registerCrudGridSuite({
  title: 'Taxes',
  path: '/accounting/definitions/taxes',
  apiResource: 'Taxes',
  createPermission: 'Taxes.Create',
  deletePermission: 'Taxes.Delete',
  columnCount: 4,
});
