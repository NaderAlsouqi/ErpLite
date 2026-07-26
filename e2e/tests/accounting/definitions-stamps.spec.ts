import { registerCrudGridSuite } from './_crud-grid.suite';

registerCrudGridSuite({
  title: 'Stamps',
  path: '/accounting/definitions/stamps',
  apiResource: 'Signatures',
  createPermission: 'Stamps.Create',
  deletePermission: 'Stamps.Delete',
  columnCount: 3,
  // Backend bug: SP_UpdateSignature / SP_DeleteSignature declare `SET NOCOUNT ON`,
  // so Dapper's ExecuteAsync returns -1 and SignatureRepository's `rows > 0`
  // check is always false → SignaturesController returns 404 (NotFound) even
  // though the row is actually updated/deleted. Create succeeds, but the edit
  // step gets "Update Signatures failed: 404", so the flow can't complete.
  // (Taxes uses the identical repo pattern and passes because its SP does not
  // suppress the affected-row count.) Fix: remove SET NOCOUNT ON from those two
  // SPs (or have UpdateAsync/DeleteAsync stop gating on the row count).
  knownWriteBug:
    'SP_UpdateSignature/SP_DeleteSignature use SET NOCOUNT ON → ExecuteAsync ' +
    'returns -1 → controller 404s on a successful update/delete (see SQL/SP_Signatures.sql).',
});
