import { registerCrudGridSuite } from './_crud-grid.suite';

registerCrudGridSuite({
  title: 'Banks',
  path: '/accounting/definitions/banks',
  apiResource: 'Banks',
  createPermission: 'Banks.Create',
  deletePermission: 'Banks.Delete',
  columnCount: 4,
});
