import { InboundVoucherPage } from '../../pages/warehouse/inbound-voucher.page';
import { stockVoucherSuite } from './stock-voucher.suite';

// سند إدخال — inbound adds stock, so a well-formed create always persists.
stockVoucherSuite('Inbound', (page) => new InboundVoucherPage(page), { expectCreateSuccess: true });
