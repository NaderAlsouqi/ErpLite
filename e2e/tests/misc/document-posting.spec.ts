import { registerDocPostingSuite } from './_doc-posting.suite';

registerDocPostingSuite({
  title: 'Document Posting',
  path: '/accounting/misc/document-posting',
  fetchApi: '/DocumentPosting/GetUnposted',
  actionApi: '/DocumentPosting/Post',
  actionBtnClass: 'btn-success',
});
