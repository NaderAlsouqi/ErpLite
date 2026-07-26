import { registerCrudGridSuite } from './_crud-grid.suite';

registerCrudGridSuite({
  title: 'Account Groups',
  path: '/accounting/definitions/account-groups',
  apiResource: 'AccountGroups',
  createPermission: 'AccountGroups.Create',
  deletePermission: 'AccountGroups.Delete',
  columnCount: 3,
});
