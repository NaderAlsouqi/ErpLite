import { registerDocPostingSuite } from './_doc-posting.suite';

registerDocPostingSuite({
  title: 'Document Unposting',
  path: '/accounting/misc/document-unposting',
  fetchApi: '/DocumentUnposting/GetPosted',
  actionApi: '/DocumentUnposting/Unpost',
  actionBtnClass: 'btn-danger',
});
