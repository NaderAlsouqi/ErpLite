import { OutboundVoucherPage } from '../../pages/warehouse/outbound-voucher.page';
import { stockVoucherSuite } from './stock-voucher.suite';

// سند إخراج — outbound issues stock; availability is not guaranteed on a shared
// tenant, so the create flow tolerates a business-rule warning/error.
stockVoucherSuite('Outbound', (page) => new OutboundVoucherPage(page), { expectCreateSuccess: false });
