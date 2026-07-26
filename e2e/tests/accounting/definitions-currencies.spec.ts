import { registerCrudGridSuite } from './_crud-grid.suite';

registerCrudGridSuite({
  title: 'Currencies',
  path: '/accounting/definitions/currencies',
  apiResource: 'Currencies',
  createPermission: 'Currencies.Create',
  deletePermission: 'Currencies.Delete',
  columnCount: 5,
});
