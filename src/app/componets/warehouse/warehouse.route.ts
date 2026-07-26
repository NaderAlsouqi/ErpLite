import { Routes } from '@angular/router';
import { PermissionGuard } from '../../shared/guards/permission.guard';

/** All warehouse screens currently share a placeholder page until built. */
const placeholder = () =>
  import('./warehouse-placeholder/warehouse-placeholder.component').then(m => m.WarehousePlaceholderComponent);

export const warehouseRoutes: Routes = [
  // ── السندات (Vouchers) ──
  { path: 'warehouse/vouchers/inbound',                loadComponent: () => import('./inbound-voucher/inbound-voucher.component').then(m => m.InboundVoucherComponent), canActivate: [PermissionGuard], data: { permissions: ['Inbound.View'] } },
  { path: 'warehouse/vouchers/outbound',               loadComponent: () => import('./outbound-voucher/outbound-voucher.component').then(m => m.OutboundVoucherComponent), canActivate: [PermissionGuard], data: { permissions: ['Outbound.View'] } },
  { path: 'warehouse/vouchers/damage',                 loadComponent: () => import('./damage-voucher/damage-voucher.component').then(m => m.DamageVoucherComponent), canActivate: [PermissionGuard], data: { permissions: ['Damage.View'] } },
  { path: 'warehouse/vouchers/transfer',               loadComponent: () => import('./transfer-voucher/transfer-voucher.component').then(m => m.TransferVoucherComponent), canActivate: [PermissionGuard], data: { permissions: ['Transfer.View'] } },
  { path: 'warehouse/vouchers/inventory-adjustment',   loadComponent: placeholder, data: { titleKey: 'Nav.Warehouse.InventoryAdjustment' } },
  { path: 'warehouse/vouchers/barcode-print',          loadComponent: () => import('./barcode-print/barcode-print.component').then(m => m.BarcodePrintComponent), canActivate: [PermissionGuard], data: { permissions: ['ItemBarcode.View'] } },
  { path: 'warehouse/vouchers/monthly-cost-closing',   loadComponent: placeholder, data: { titleKey: 'Nav.Warehouse.MonthlyCostClosing' } },

  // ── التقارير (Reports) ──
  { path: 'warehouse/reports/material-balances',       loadComponent: () => import('./material-balances/material-balances.component').then(m => m.MaterialBalancesComponent), canActivate: [PermissionGuard], data: { permissions: ['MaterialBalances.View'] } },
  { path: 'warehouse/reports/reorder-level',           loadComponent: () => import('./reorder-level/reorder-level.component').then(m => m.ReorderLevelComponent), canActivate: [PermissionGuard], data: { permissions: ['ReorderLevel.View'] } },
  { path: 'warehouse/reports/material-movement',       loadComponent: () => import('./material-movement/material-movement.component').then(m => m.MaterialMovementComponent), canActivate: [PermissionGuard], data: { permissions: ['MaterialMovement.View'] } },
  { path: 'warehouse/reports/stock-list',              loadComponent: () => import('./stock-list/stock-list.component').then(m => m.StockListComponent), canActivate: [PermissionGuard], data: { permissions: ['StockList.View'] } },
  { path: 'warehouse/reports/zeroed-items',            loadComponent: () => import('./zeroed-items/zeroed-items.component').then(m => m.ZeroedItemsComponent), canActivate: [PermissionGuard], data: { permissions: ['ZeroedItems.View'] } },
  { path: 'warehouse/reports/item-prices',             loadComponent: () => import('./item-prices/item-prices.component').then(m => m.ItemPricesComponent), canActivate: [PermissionGuard], data: { permissions: ['ItemPrices.View'] } },
  { path: 'warehouse/reports/items-pricing',           loadComponent: () => import('./items-pricing/items-pricing.component').then(m => m.ItemsPricingComponent), canActivate: [PermissionGuard], data: { permissions: ['ItemsPricing.View'] } },
  { path: 'warehouse/reports/batch-expiry',            loadComponent: () => import('./batch-expiry/batch-expiry.component').then(m => m.BatchExpiryComponent), canActivate: [PermissionGuard], data: { permissions: ['BatchExpiry.View'] } },
  { path: 'warehouse/reports/store-movements',         loadComponent: () => import('./store-movements/store-movements.component').then(m => m.StoreMovementsComponent), canActivate: [PermissionGuard], data: { permissions: ['StoreMovements.View'] } },
  { path: 'warehouse/reports/inbound-print',           loadComponent: () => import('./inbound-print/inbound-print.component').then(m => m.InboundPrintComponent), canActivate: [PermissionGuard], data: { permissions: ['InboundPrint.View'] } },
  { path: 'warehouse/reports/outbound-print',          loadComponent: () => import('./outbound-print/outbound-print.component').then(m => m.OutboundPrintComponent), canActivate: [PermissionGuard], data: { permissions: ['OutboundPrint.View'] } },
  { path: 'warehouse/reports/damage-print',            loadComponent: () => import('./damage-print/damage-print.component').then(m => m.DamagePrintComponent), canActivate: [PermissionGuard], data: { permissions: ['DamagePrint.View'] } },
  { path: 'warehouse/reports/transfer-print',          loadComponent: () => import('./transfer-print/transfer-print.component').then(m => m.TransferPrintComponent), canActivate: [PermissionGuard], data: { permissions: ['TransferPrint.View'] } },
  { path: 'warehouse/reports/categories-list',         loadComponent: () => import('./categories-list/categories-list.component').then(m => m.CategoriesListComponent), canActivate: [PermissionGuard], data: { permissions: ['CategoriesList.View'] } },
  { path: 'warehouse/reports/stagnant-items',          loadComponent: () => import('./stagnant-items/stagnant-items.component').then(m => m.StagnantItemsComponent), canActivate: [PermissionGuard], data: { permissions: ['StagnantItems.View'] } },
  { path: 'warehouse/reports/slow-moving',             loadComponent: () => import('./slow-moving/slow-moving.component').then(m => m.SlowMovingComponent), canActivate: [PermissionGuard], data: { permissions: ['SlowMoving.View'] } },
  { path: 'warehouse/reports/disbursement-movement',   loadComponent: () => import('./disbursement-movement/disbursement-movement.component').then(m => m.DisbursementMovementComponent), canActivate: [PermissionGuard], data: { permissions: ['DisbursementMovement.View'] } },
  { path: 'warehouse/reports/client-movement',         loadComponent: () => import('./client-movement/client-movement.component').then(m => m.ClientMovementComponent), canActivate: [PermissionGuard], data: { permissions: ['ClientMovement.View'] } },
  { path: 'warehouse/reports/category-disbursement',   loadComponent: () => import('./category-disbursement/category-disbursement.component').then(m => m.CategoryDisbursementComponent), canActivate: [PermissionGuard], data: { permissions: ['CategoryDisbursement.View'] } },

  // ── شاشات الإدخال (Entry Screens) ──
  { path: 'warehouse/entry/units',                 loadComponent: () => import('./units/units.component').then(m => m.UnitsComponent), canActivate: [PermissionGuard], data: { permissions: ['Units.View'] } },
  { path: 'warehouse/entry/warehouses',            loadComponent: () => import('./stores/stores.component').then(m => m.StoresComponent), canActivate: [PermissionGuard], data: { permissions: ['Stores.View'] } },
  { path: 'warehouse/entry/suppliers',             loadComponent: () => import('./vendors/vendors.component').then(m => m.VendorsComponent), canActivate: [PermissionGuard], data: { permissions: ['Vendors.View'] } },
  { path: 'warehouse/entry/disbursement-entities', loadComponent: () => import('./disbursement-entities/disbursement-entities.component').then(m => m.DisbursementEntitiesComponent), canActivate: [PermissionGuard], data: { permissions: ['DisbursementEntities.View'] } },
  { path: 'warehouse/entry/origin-country',        loadComponent: () => import('./origin-country/origin-country.component').then(m => m.OriginCountryComponent), canActivate: [PermissionGuard], data: { permissions: ['OriginCountry.View'] } },
  { path: 'warehouse/entry/price-categories',      loadComponent: () => import('./price-categories/price-categories.component').then(m => m.PriceCategoriesComponent), canActivate: [PermissionGuard], data: { permissions: ['PriceCategory.View'] } },
  { path: 'warehouse/entry/main-items',            loadComponent: () => import('./main-categories/main-categories.component').then(m => m.MainCategoriesComponent), canActivate: [PermissionGuard], data: { permissions: ['MainCategories.View'] } },
  { path: 'warehouse/entry/sub-items',             loadComponent: () => import('./sub-categories/sub-categories.component').then(m => m.SubCategoriesComponent), canActivate: [PermissionGuard], data: { permissions: ['SubCategories.View'] } },
  { path: 'warehouse/entry/item-card',             loadComponent: () => import('./item-card/item-card.component').then(m => m.ItemCardComponent), canActivate: [PermissionGuard], data: { permissions: ['ItemCard.View'], permPrefix: 'ItemCard' } },
  { path: 'warehouse/entry/material-offers',       loadComponent: placeholder, data: { titleKey: 'Nav.Warehouse.MaterialOffers' } },
  { path: 'warehouse/entry/barcode',               loadComponent: () => import('./item-barcode/item-barcode.component').then(m => m.ItemBarcodeComponent), canActivate: [PermissionGuard], data: { permissions: ['ItemBarcode.View'] } },
  { path: 'warehouse/entry/replace-item-code',     loadComponent: () => import('./replace-item-code/replace-item-code.component').then(m => m.ReplaceItemCodeComponent), canActivate: [PermissionGuard], data: { permissions: ['ReplaceItemCode.View'] } },
  { path: 'warehouse/entry/brands',                loadComponent: () => import('./brands/brands.component').then(m => m.BrandsComponent), canActivate: [PermissionGuard], data: { permissions: ['Brands.View'] } },
];
