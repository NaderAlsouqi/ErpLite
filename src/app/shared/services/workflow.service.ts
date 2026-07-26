import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/* ─────────────────────────── Models ─────────────────────────── */

export type ParamType = 'text' | 'number' | 'date' | 'year' | 'select';

export interface CatalogParam {
  name: string;
  labelAr: string;
  labelEn: string;
  type: ParamType;
  options?: { value: string | number; labelAr: string; labelEn: string }[];
  default?: string | number;
}

/** A draggable page/action available in the palette. */
export interface CatalogItem {
  key: string;
  titleAr: string;
  titleEn: string;
  module: string;       // grouping (matches i18n / permission module)
  moduleAr: string;
  icon: string;         // bootstrap-icons class
  actionType: string;   // open/report/export/approve/save/edit/delete
  route?: string;       // app route this step points at (optional)
  entity?: string;      // set on master-data pages → save/edit/delete auto-execute on run
  doc?: boolean;        // GL document (multi-line): add/edit/delete open the real page in that mode
  titleKey?: string;    // i18n key (auto pages) → translated at display time
  params?: CatalogParam[];
  afterReport?: boolean; // step is only valid immediately after a report step (e.g. print)
}

/* NOTE: the API serializes DTOs with their C# property names (PascalCase),
   so these interfaces mirror that exactly. Client-only helper fields on a
   step are lower-cased to keep them distinct from server data. */
export interface WorkflowStep {
  // server fields
  StepId?: number;
  StepOrder?: number;
  PageKey: string;
  PageTitle?: string;
  ActionType?: string;
  ParametersJson?: string;
  Notes?: string;
  // client-only helpers
  icon?: string;
  module?: string;
  moduleAr?: string;
  params?: CatalogParam[];           // param definitions for rendering
  values?: { [name: string]: any };  // supplied parameter values
  expanded?: boolean;
}

export interface Workflow {
  WorkflowId?: number | null;
  Name: string;
  Description?: string;
  Status?: string;         // Draft/Active/Paused
  TriggerType?: string;    // Manual/Scheduled
  ScheduleCron?: string;
  AssignedTo?: number | null;
  AssignedToName?: string;
  CreatedBy?: number | null;
  CreatedByName?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  Steps: WorkflowStep[];
}

export interface WorkflowListRow {
  WorkflowId: number;
  Name: string;
  Description?: string;
  Status?: string;
  TriggerType?: string;
  ScheduleCron?: string;
  AssignedTo?: number;
  AssignedToName?: string;
  CreatedByName?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  StepCount: number;
  TaskCount: number;
}

export interface WorkflowUser { UserId: number; UserName: string; FullName?: string; }

export interface RunWorkflowRequest {
  WorkflowId: number;
  Title?: string;
  ResultJson?: string;
  Priority?: string;
  DueDate?: string | null;
}

export interface TaskComment {
  CommentId: number;
  Comment: string;
  CommentBy?: number;
  CommentByName?: string;
  CommentAt?: string;
}

export interface WorkflowTask {
  TaskId: number;
  WorkflowId?: number;
  WorkflowName?: string;
  Title?: string;
  Status?: string;         // Pending/InReview/Approved/Rejected
  Priority?: string;
  AssignedTo?: number;
  AssignedToName?: string;
  CreatedBy?: number;
  CreatedByName?: string;
  ResultJson?: string;
  ReviewComment?: string;
  ReviewedBy?: number;
  ReviewedByName?: string;
  CreatedAt?: string;
  DueDate?: string;
  ReviewedAt?: string;
  Comments?: TaskComment[];
  Approvals?: TaskApproval[];
}

export interface WorkflowTaskListRow {
  TaskId: number;
  WorkflowId?: number;
  WorkflowName?: string;
  Title?: string;
  Status?: string;
  Priority?: string;
  AssignedTo?: number;
  AssignedToName?: string;
  CreatedByName?: string;
  CreatedAt?: string;
  DueDate?: string;
  ReviewedByName?: string;
  ReviewedAt?: string;
  CommentCount: number;
}

export interface ReviewTaskRequest { TaskId: number; Status: string; Comment?: string; }

export interface TaskApproval {
  ApprovalId: number;
  TaskId: number;
  StepOrder: number;
  PageKey?: string;
  ActionType?: string;     // approve / post
  Title?: string;
  ParamsJson?: string;
  AssignedTo?: number;
  AssignedToName?: string;
  Status?: string;         // Pending / Approved / Rejected
  ReviewedBy?: number;
  ReviewedByName?: string;
  ReviewedAt?: string;
  Comment?: string;
}
export interface ReviewApprovalRequest { ApprovalId: number; Status: string; Comment?: string; }

/* ───────────────────── Draggable page catalog ─────────────────────
   The pages/actions a user can drag onto a workflow. Each carries the
   parameters the builder will prompt for. Grouped by module. */
export const PAGE_CATALOG: CatalogItem[] = [
  // ── Reports ──
  { key: 'reports.trial-balance', titleEn: 'Trial Balance', titleAr: 'ميزان المراجعة', module: 'Reports', moduleAr: 'التقارير', icon: 'bi-table', actionType: 'report', route: '/accounting/reports/trial-balance',
    params: [ { name: 'dateFrom', labelEn: 'From date', labelAr: 'من تاريخ', type: 'date' }, { name: 'dateTo', labelEn: 'To date', labelAr: 'إلى تاريخ', type: 'date' } ] },
  { key: 'reports.income-statement', titleEn: 'Income Statement', titleAr: 'قائمة الدخل', module: 'Reports', moduleAr: 'التقارير', icon: 'bi-graph-up-arrow', actionType: 'report', route: '/accounting/reports/income-statement',
    params: [ { name: 'dateFrom', labelEn: 'From date', labelAr: 'من تاريخ', type: 'date' }, { name: 'dateTo', labelEn: 'To date', labelAr: 'إلى تاريخ', type: 'date' } ] },
  { key: 'reports.balance-sheet', titleEn: 'Balance Sheet', titleAr: 'الميزانية العمومية', module: 'Reports', moduleAr: 'التقارير', icon: 'bi-clipboard-data', actionType: 'report', route: '/accounting/reports/balance-sheet',
    params: [ { name: 'asOfDate', labelEn: 'As of', labelAr: 'كما في', type: 'date' } ] },
  { key: 'reports.aging-analysis', titleEn: 'Aging Analysis', titleAr: 'تحليل الأعمار', module: 'Reports', moduleAr: 'التقارير', icon: 'bi-hourglass-split', actionType: 'report', route: '/accounting/reports/aging-analysis',
    params: [ { name: 'asOfDate', labelEn: 'As of', labelAr: 'كما في', type: 'date' } ] },
  { key: 'reports.detailed-statement', titleEn: 'Detailed Statement', titleAr: 'كشف حساب تفصيلي', module: 'Reports', moduleAr: 'التقارير', icon: 'bi-list-columns', actionType: 'report', route: '/accounting/reports/detailed-statement',
    params: [ { name: 'accNo', labelEn: 'Account no', labelAr: 'رقم الحساب', type: 'number' }, { name: 'dateFrom', labelEn: 'From date', labelAr: 'من تاريخ', type: 'date' }, { name: 'dateTo', labelEn: 'To date', labelAr: 'إلى تاريخ', type: 'date' } ] },
  // ── Accounting vouchers (open-in-mode: add→new, edit/delete→by doc no) ──
  { key: 'accounting.journal', titleEn: 'Journal Voucher', titleAr: 'سند قيد', module: 'Accounting', moduleAr: 'المحاسبة', icon: 'bi-journal-text', actionType: 'add', route: '/accounting/vouchers/journal', doc: true,
    params: [ { name: 'docNum', labelEn: 'Doc no (edit/delete)', labelAr: 'رقم المستند (للتعديل/الحذف)', type: 'number' }, { name: 'vType', labelEn: 'Serial type (edit/delete)', labelAr: 'نوع التسلسل (للتعديل/الحذف)', type: 'number' }, { name: 'year', labelEn: 'Financial year', labelAr: 'السنة المالية', type: 'year' } ] },
  { key: 'accounting.cash-payment', titleEn: 'Cash Payment', titleAr: 'سند صرف نقدي', module: 'Accounting', moduleAr: 'المحاسبة', icon: 'bi-cash-stack', actionType: 'add', route: '/accounting/vouchers/cash-payment', doc: true,
    params: [ { name: 'docNum', labelEn: 'Doc no (edit/delete)', labelAr: 'رقم المستند (للتعديل/الحذف)', type: 'number' }, { name: 'vType', labelEn: 'Serial type (edit/delete)', labelAr: 'نوع التسلسل (للتعديل/الحذف)', type: 'number' }, { name: 'year', labelEn: 'Financial year', labelAr: 'السنة المالية', type: 'year' } ] },
  { key: 'accounting.receipt', titleEn: 'Receipt Voucher', titleAr: 'سند قبض', module: 'Accounting', moduleAr: 'المحاسبة', icon: 'bi-cash-coin', actionType: 'add', route: '/accounting/receipt-vouchers', doc: true,
    params: [ { name: 'docNum', labelEn: 'Doc no (edit/delete)', labelAr: 'رقم المستند (للتعديل/الحذف)', type: 'number' }, { name: 'vType', labelEn: 'Serial type (edit/delete)', labelAr: 'نوع التسلسل (للتعديل/الحذف)', type: 'number' }, { name: 'year', labelEn: 'Financial year', labelAr: 'السنة المالية', type: 'year' } ] },
  { key: 'accounting.service-invoice', titleEn: 'Service Invoice', titleAr: 'فاتورة خدمات', module: 'Accounting', moduleAr: 'المحاسبة', icon: 'bi-file-earmark-text', actionType: 'add', route: '/accounting/invoices/service', doc: true,
    params: [ { name: 'docNum', labelEn: 'Bill no (edit/delete)', labelAr: 'رقم الفاتورة (للتعديل/الحذف)', type: 'number' }, { name: 'vType', labelEn: 'Serial type (edit/delete)', labelAr: 'نوع التسلسل (للتعديل/الحذف)', type: 'number' }, { name: 'year', labelEn: 'Financial year', labelAr: 'السنة المالية', type: 'year' } ] },

  // ── Warehouse (open-in-mode) ──
  { key: 'warehouse.inbound', titleEn: 'Stock-in Voucher', titleAr: 'سند إدخال', module: 'Warehouse', moduleAr: 'المستودعات', icon: 'bi-box-arrow-in-down', actionType: 'add', route: '/warehouse/vouchers/inbound', doc: true,
    params: [ { name: 'docNum', labelEn: 'Doc no (edit/delete)', labelAr: 'رقم المستند (للتعديل/الحذف)', type: 'number' }, { name: 'vType', labelEn: 'Serial type (edit/delete)', labelAr: 'نوع التسلسل (للتعديل/الحذف)', type: 'number' }, { name: 'year', labelEn: 'Financial year', labelAr: 'السنة المالية', type: 'year' } ] },
  { key: 'warehouse.outbound', titleEn: 'Stock-out Voucher', titleAr: 'سند إخراج', module: 'Warehouse', moduleAr: 'المستودعات', icon: 'bi-box-arrow-up', actionType: 'add', route: '/warehouse/vouchers/outbound', doc: true,
    params: [ { name: 'docNum', labelEn: 'Doc no (edit/delete)', labelAr: 'رقم المستند (للتعديل/الحذف)', type: 'number' }, { name: 'vType', labelEn: 'Serial type (edit/delete)', labelAr: 'نوع التسلسل (للتعديل/الحذف)', type: 'number' }, { name: 'year', labelEn: 'Financial year', labelAr: 'السنة المالية', type: 'year' } ] },
  { key: 'warehouse.damage', titleEn: 'Damage Voucher', titleAr: 'سند إتلاف', module: 'Warehouse', moduleAr: 'المستودعات', icon: 'bi-trash', actionType: 'add', route: '/warehouse/vouchers/damage', doc: true,
    params: [ { name: 'docNum', labelEn: 'Doc no (edit/delete)', labelAr: 'رقم المستند (للتعديل/الحذف)', type: 'number' }, { name: 'vType', labelEn: 'Serial type (edit/delete)', labelAr: 'نوع التسلسل (للتعديل/الحذف)', type: 'number' }, { name: 'year', labelEn: 'Financial year', labelAr: 'السنة المالية', type: 'year' } ] },
  { key: 'warehouse.item-card', titleEn: 'Item Card', titleAr: 'بطاقة مادة', module: 'Warehouse', moduleAr: 'المستودعات', icon: 'bi-upc-scan', actionType: 'open', route: '/warehouse/entry/item-card' },

  // ── Sales ──
  { key: 'sales.invoice', titleEn: 'Sales Invoice', titleAr: 'فاتورة مبيعات', module: 'Sales', moduleAr: 'المبيعات', icon: 'bi-cart-check', actionType: 'open', route: '/sales/invoice' },
  { key: 'sales.refund', titleEn: 'Sales Refund', titleAr: 'مرتجع مبيعات', module: 'Sales', moduleAr: 'المبيعات', icon: 'bi-arrow-counterclockwise', actionType: 'open', route: '/sales/refund' },

  // ── Master data (auto create/update/delete on run) ──
  { key: 'master.brands', titleEn: 'Brand', titleAr: 'ماركة', module: 'Master Data', moduleAr: 'التعاريف', icon: 'bi-tag', actionType: 'save', entity: 'Brands',
    params: [ { name: 'BrandNo', labelEn: 'No (edit/delete)', labelAr: 'الرقم (للتعديل/الحذف)', type: 'number' }, { name: 'BrandName', labelEn: 'Name (AR)', labelAr: 'الاسم', type: 'text' }, { name: 'BrandEname', labelEn: 'Name (EN)', labelAr: 'الاسم بالإنجليزية', type: 'text' } ] },
  { key: 'master.disbursement', titleEn: 'Disbursement Entity', titleAr: 'جهة صرف', module: 'Master Data', moduleAr: 'التعاريف', icon: 'bi-truck', actionType: 'save', entity: 'DisbursementEntities',
    params: [ { name: 'Tg', labelEn: 'No (edit/delete)', labelAr: 'الرقم (للتعديل/الحذف)', type: 'number' }, { name: 'Name', labelEn: 'Name (AR)', labelAr: 'الاسم', type: 'text' }, { name: 'Ename', labelEn: 'Name (EN)', labelAr: 'الاسم بالإنجليزية', type: 'text' }, { name: 'Tel', labelEn: 'Phone', labelAr: 'الهاتف', type: 'text' } ] },
  { key: 'master.units', titleEn: 'Unit', titleAr: 'وحدة', module: 'Master Data', moduleAr: 'التعاريف', icon: 'bi-rulers', actionType: 'save', entity: 'Units',
    params: [ { name: 'UnitNo', labelEn: 'No (edit/delete)', labelAr: 'الرقم (للتعديل/الحذف)', type: 'number' }, { name: 'UnitName', labelEn: 'Name (AR)', labelAr: 'الاسم', type: 'text' }, { name: 'UnitEname', labelEn: 'Name (EN)', labelAr: 'الاسم بالإنجليزية', type: 'text' } ] },
  { key: 'master.origin-countries', titleEn: 'Origin Country', titleAr: 'بلد منشأ', module: 'Master Data', moduleAr: 'التعاريف', icon: 'bi-globe2', actionType: 'save', entity: 'OriginCountries',
    params: [ { name: 'OriginNo', labelEn: 'No (edit/delete)', labelAr: 'الرقم (للتعديل/الحذف)', type: 'number' }, { name: 'OriginName', labelEn: 'Name (AR)', labelAr: 'الاسم', type: 'text' }, { name: 'OriginEname', labelEn: 'Name (EN)', labelAr: 'الاسم بالإنجليزية', type: 'text' } ] },
  { key: 'master.price-categories', titleEn: 'Price Category', titleAr: 'فئة سعر', module: 'Master Data', moduleAr: 'التعاريف', icon: 'bi-tags', actionType: 'save', entity: 'PriceCategories',
    params: [ { name: 'CatNo', labelEn: 'No (edit/delete)', labelAr: 'الرقم (للتعديل/الحذف)', type: 'number' }, { name: 'CatName', labelEn: 'Name (AR)', labelAr: 'الاسم', type: 'text' }, { name: 'CatEname', labelEn: 'Name (EN)', labelAr: 'الاسم بالإنجليزية', type: 'text' } ] },
  { key: 'master.accounts', titleEn: 'Chart of Accounts', titleAr: 'شجرة الحسابات', module: 'Master Data', moduleAr: 'التعاريف', icon: 'bi-diagram-3', actionType: 'save', entity: 'Accounts',
    params: [ { name: 'no', labelEn: 'Account no', labelAr: 'رقم الحساب', type: 'number' }, { name: 'name', labelEn: 'Name (AR)', labelAr: 'الاسم', type: 'text' }, { name: 'Ename', labelEn: 'Name (EN)', labelAr: 'الاسم بالإنجليزية', type: 'text' }, { name: 'belong', labelEn: 'Parent account', labelAr: 'الحساب الأب', type: 'number' } ] },

  // ── Control / approval steps ──
  { key: 'control.approval', titleEn: 'Approval Gate', titleAr: 'بوابة اعتماد', module: 'Control', moduleAr: 'التحكم', icon: 'bi-patch-check', actionType: 'approve',
    params: [ { name: 'approver', labelEn: 'Approver note', labelAr: 'ملاحظة المعتمد', type: 'text' } ] },
  // Posts (اعتماد) unposted GL vouchers when the task is approved; scope = the
  // preceding step's year (its ?year → that year's date range).
  { key: 'control.post', titleEn: 'Post & Approve Vouchers', titleAr: 'اعتماد وترحيل السندات', module: 'Control', moduleAr: 'التحكم', icon: 'bi-check2-circle', actionType: 'post' },
  { key: 'control.notify', titleEn: 'Notify Reviewer', titleAr: 'إشعار المراجع', module: 'Control', moduleAr: 'التحكم', icon: 'bi-bell', actionType: 'approve',
    params: [ { name: 'message', labelEn: 'Message', labelAr: 'الرسالة', type: 'text' } ] },
  { key: 'control.export', titleEn: 'Export / Attach', titleAr: 'تصدير / إرفاق', module: 'Control', moduleAr: 'التحكم', icon: 'bi-download', actionType: 'export',
    params: [ { name: 'format', labelEn: 'Format', labelAr: 'الصيغة', type: 'select', default: 'pdf',
      options: [ { value: 'pdf', labelEn: 'PDF', labelAr: 'PDF' }, { value: 'excel', labelEn: 'Excel', labelAr: 'إكسل' }, { value: 'word', labelEn: 'Word', labelAr: 'وورد' } ] } ] },
  // Print the preceding report — only valid immediately after a report step.
  { key: 'control.print', titleEn: 'Print Report', titleAr: 'طباعة التقرير', module: 'Control', moduleAr: 'التحكم', icon: 'bi-printer', actionType: 'print', afterReport: true },
];

/* ─────────────────────────── Service ─────────────────────────── */
@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private wfUrl = `${environment.apiUrl}/Workflow`;
  private taskUrl = `${environment.apiUrl}/Tasks`;

  catalog: CatalogItem[] = [...PAGE_CATALOG];

  constructor(private http: HttpClient) {}

  /**
   * Merge every nav-menu page that isn't already curated into the catalog as a
   * simple "open" step, grouped under "System Pages". This means any page added
   * to the menu in the future shows up in the workflow builder automatically.
   */
  syncCatalogFromNav(navItems: any[]): void {
    const curatedRoutes = new Set(PAGE_CATALOG.map(c => c.route).filter(Boolean));
    const seen = new Set<string>();
    const auto: CatalogItem[] = [];
    const walk = (list: any[]) => {
      for (const it of list || []) {
        const path: string | undefined = it?.path;
        if (it?.type === 'link' && path && !curatedRoutes.has(path) && !seen.has(path)) {
          seen.add(path);
          auto.push({
            key: 'page:' + path,
            titleKey: it.translationKey,
            titleAr: it.title || path,
            titleEn: it.title || path,
            module: 'System Pages',
            moduleAr: 'صفحات النظام',
            icon: it.icon || 'bi-file-earmark-text',
            actionType: 'open',
            route: path,
          });
        }
        if (it?.children?.length) walk(it.children);
      }
    };
    walk(navItems);
    this.catalog = [...PAGE_CATALOG, ...auto];
  }

  // workflows (responses are PascalCase to match the API)
  getUsers(): Observable<WorkflowUser[]> { return this.http.get<WorkflowUser[]>(`${this.wfUrl}/Users`); }
  listWorkflows(): Observable<WorkflowListRow[]> { return this.http.get<WorkflowListRow[]>(`${this.wfUrl}/List`); }
  getWorkflow(id: number): Observable<Workflow> { return this.http.get<Workflow>(`${this.wfUrl}/Get/${id}`); }
  saveWorkflow(wf: Workflow): Observable<{ Message?: string; WorkflowId: number }> { return this.http.post<{ Message?: string; WorkflowId: number }>(`${this.wfUrl}/Save`, wf); }
  deleteWorkflow(id: number): Observable<any> { return this.http.delete(`${this.wfUrl}/Delete/${id}`); }
  runWorkflow(req: RunWorkflowRequest): Observable<{ Message?: string; TaskId: number; AssignedTo?: number; AssignedToName?: string }> {
    return this.http.post<{ Message?: string; TaskId: number; AssignedTo?: number; AssignedToName?: string }>(`${this.wfUrl}/Run`, req);
  }

  // tasks
  listTasks(mine: boolean, status?: string): Observable<WorkflowTaskListRow[]> {
    let p = new HttpParams().set('mine', mine);
    if (status) p = p.set('status', status);
    return this.http.get<WorkflowTaskListRow[]>(`${this.taskUrl}/List`, { params: p });
  }
  getTask(id: number): Observable<WorkflowTask> { return this.http.get<WorkflowTask>(`${this.taskUrl}/Get/${id}`); }
  getTaskPdf(id: number): Observable<Blob> { return this.http.get(`${this.taskUrl}/Pdf/${id}`, { responseType: 'blob' }); }
  reviewTask(req: ReviewTaskRequest): Observable<{ Message?: string; TaskId: number }> { return this.http.post<{ Message?: string; TaskId: number }>(`${this.taskUrl}/Review`, req); }
  reviewApproval(req: ReviewApprovalRequest): Observable<TaskApproval> { return this.http.post<TaskApproval>(`${this.taskUrl}/ReviewApproval`, req); }
  addComment(taskId: number, comment: string): Observable<TaskComment> { return this.http.post<TaskComment>(`${this.taskUrl}/Comment`, { TaskId: taskId, Comment: comment }); }
}
