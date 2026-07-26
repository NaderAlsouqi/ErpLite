import { DamageVoucherPage } from '../../pages/warehouse/damage-voucher.page';
import { stockVoucherSuite } from './stock-voucher.suite';

// سند إتلاف — damage writes off stock; like outbound, availability is not
// guaranteed, so the create flow tolerates a business-rule warning/error.
stockVoucherSuite('Damage', (page) => new DamageVoucherPage(page), { expectCreateSuccess: false });
