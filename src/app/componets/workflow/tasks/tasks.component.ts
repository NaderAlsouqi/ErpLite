import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { WorkflowService, WorkflowTask, WorkflowTaskListRow, TaskApproval } from '../../../shared/services/workflow.service';
import { VoucherPostingService } from '../../../shared/services/voucher-posting.service';
import { AuthService } from '../../../shared/services/auth.service';
import { NavService } from '../../../shared/services/navservice';

interface ResultStep { order?: number; title?: string; actionType?: string; pageKey?: string; values?: any; status?: string; message?: string; createdId?: number; rows?: any[]; }

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, HasPermissionDirective],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit {
  tasks: WorkflowTaskListRow[] = [];
  loading = false;
  mine = true;
  statusFilter: string | null = null;
  readonly statuses = ['Pending', 'InReview', 'Approved', 'Rejected'];

  selected: WorkflowTask | null = null;
  parsedSteps: ResultStep[] = [];
  detailLoading = false;

  reviewComment = '';
  newComment = '';
  saving = false;
  pdfLoading = false;

  constructor(
    private svc: WorkflowService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    private posting: VoucherPostingService,
    private auth: AuthService,
    private nav: NavService,
  ) {}

  get myId(): number | null { return (this.auth.currentUserValue as any)?.ID ?? null; }
  /** Only the assigned approver (or a Tasks.Review admin) may act on an approval. */
  canApprove(a: TaskApproval): boolean {
    return a.Status === 'Pending' && (a.AssignedTo === this.myId || this.auth.hasPermission('Tasks.Review'));
  }
  hasActionableApproval(): boolean { return !!this.selected?.Approvals?.some(a => this.canApprove(a)); }
  approvalCls2(s?: string): string { return s === 'Approved' ? 'Approved' : s === 'Rejected' ? 'Rejected' : 'Pending'; }

  /** The app route a captured step points at (report / screen), if any. */
  stepRoute(pageKey?: string): string | undefined {
    if (pageKey?.startsWith('page:')) return pageKey.slice(5);   // auto-derived nav page
    return this.svc.catalog.find(c => c.key === pageKey)?.route;
  }

  /** Open the step's report/page in a new tab with its parameters applied. */
  openResult(step: ResultStep): void {
    const route = this.stepRoute(step.pageKey);
    if (!route) return;
    const qp: { [k: string]: any } = {};
    const v = step.values || {};
    Object.keys(v).forEach(k => { if (v[k] !== '' && v[k] != null) qp[k] = v[k]; });
    if (step.actionType === 'add') delete qp['docNum'];   // add = a brand-new document
    const url = this.router.serializeUrl(this.router.createUrlTree([route], { queryParams: qp }));
    window.open(url, '_blank');
  }

  openLabel(s: ResultStep): string {
    return this.translate.instant(s.actionType === 'report' ? 'Tasks.ViewResult' : 'Tasks.OpenPage');
  }

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.listTasks(this.mine, this.statusFilter || undefined).subscribe({
      next: (r) => { this.tasks = r || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void { this.selected = null; this.load(); }

  countBy(status: string): number { return this.tasks.filter(t => t.Status === status).length; }

  open(row: WorkflowTaskListRow): void {
    this.detailLoading = true;
    this.reviewComment = '';
    this.newComment = '';
    this.svc.getTask(row.TaskId).subscribe({
      next: (t) => {
        this.selected = t;
        this.parsedSteps = [];
        if (t.ResultJson) {
          try {
            const parsed = JSON.parse(t.ResultJson);
            this.parsedSteps = parsed?.steps || [];
          } catch { this.parsedSteps = []; }
        }
        this.detailLoading = false;
      },
      error: () => { this.detailLoading = false; this.toastr.error(this.translate.instant('Tasks.LoadError')); },
    });
  }

  valueKeys(values: any): string[] { return values ? Object.keys(values).filter(k => values[k] !== '' && values[k] != null) : []; }
  rowCols(rows: any[]): string[] { return rows && rows.length ? Object.keys(rows[0]) : []; }

  review(status: string): void {
    if (!this.selected) return;
    if (status === 'Rejected' && !this.reviewComment.trim()) {
      this.toastr.warning(this.translate.instant('Tasks.RejectNeedsComment'));
      return;
    }
    this.saving = true;
    this.svc.reviewTask({ TaskId: this.selected.TaskId, Status: status, Comment: this.reviewComment.trim() || undefined }).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.translate.instant('Tasks.Reviewed'));
        if (this.selected) {
          this.selected.Status = status;
          this.selected.ReviewComment = this.reviewComment.trim();
          if (this.reviewComment.trim()) {
            this.selected.Comments = this.selected.Comments || [];
            this.selected.Comments.push({ CommentId: 0, Comment: this.reviewComment.trim(), CommentByName: this.translate.instant('Tasks.You'), CommentAt: new Date().toISOString() });
          }
        }
        this.reviewComment = '';
        const row = this.tasks.find(t => t.TaskId === this.selected?.TaskId);
        if (row) row.Status = status;
        this.nav.refreshTaskBadge();
      },
      error: (e) => { this.saving = false; this.toastr.error(e?.error?.message || this.translate.instant('Tasks.ReviewError')); },
    });
  }

  /** The assigned approver acts on a single بوابة اعتماد / اعتماد وترحيل step. */
  reviewApproval(a: TaskApproval, status: 'Approved' | 'Rejected'): void {
    if (status === 'Rejected' && !this.reviewComment.trim()) {
      this.toastr.warning(this.translate.instant('Tasks.RejectNeedsComment'));
      return;
    }
    this.svc.reviewApproval({ ApprovalId: a.ApprovalId, Status: status, Comment: this.reviewComment.trim() || undefined }).subscribe({
      next: () => {
        a.Status = status;
        a.ReviewedByName = this.translate.instant('Tasks.You');
        this.reviewComment = '';
        this.toastr.success(this.translate.instant('Tasks.Reviewed'));
        // Approving an اعتماد وترحيل step posts the GL vouchers.
        if (status === 'Approved' && a.ActionType === 'post') this.postForApproval(a);
      },
      error: (e) => this.toastr.error(e?.error?.message || this.translate.instant('Tasks.ReviewError')),
    });
  }

  /** Post the GL vouchers for a "post" approval, scoped from the preceding step. */
  private postForApproval(a: TaskApproval): void {
    const steps = this.parsedSteps || [];
    const prev = steps.filter(s => (s.order ?? 0) < a.StepOrder).slice(-1)[0];
    const v = (prev && prev.values) || {};
    let fromDate: string | null = null, toDate: string | null = null;
    if (v.year) { fromDate = `${v.year}-01-01`; toDate = `${v.year}-12-31`; }
    else if (v.dateFrom || v.dateTo) { fromDate = v.dateFrom || null; toDate = v.dateTo || null; }
    this.posting.post(fromDate, toDate).subscribe({
      next: (r: any) => this.toastr.success(this.translate.instant('Tasks.Posted', { n: r?.posted ?? 0 })),
      error: (e: any) => this.toastr.error(e?.error?.message || this.translate.instant('Tasks.PostFailed')),
    });
  }

  addComment(): void {
    if (!this.selected || !this.newComment.trim()) return;
    this.svc.addComment(this.selected.TaskId, this.newComment.trim()).subscribe({
      next: (c) => {
        this.selected!.Comments = this.selected!.Comments || [];
        this.selected!.Comments.push(c);
        this.newComment = '';
      },
      error: () => this.toastr.error(this.translate.instant('Tasks.CommentError')),
    });
  }

  statusLabel(s?: string): string { return this.translate.instant('Tasks.Status.' + (s || 'Pending')); }

  // ── Approval Gate reflects the task's review outcome (activates on approve) ──
  private approvalState(): 'success' | 'error' | 'wait' {
    const st = this.selected?.Status;
    return st === 'Approved' ? 'success' : st === 'Rejected' ? 'error' : 'wait';
  }
  approvalCls(): string { return this.approvalState(); }
  approvalIcon(): string {
    const s = this.approvalState();
    return s === 'success' ? 'bi-check-circle-fill' : s === 'error' ? 'bi-x-circle-fill' : 'bi-hourglass-split';
  }
  approvalLabel(): string {
    const s = this.approvalState();
    return s === 'success' ? 'Tasks.Activated' : s === 'error' ? 'Tasks.Blocked' : 'Tasks.AwaitingApproval';
  }

  /** Fetch the task's run PDF (auth-safe blob) and open it in a new tab. */
  viewPdf(): void {
    if (!this.selected) return;
    this.pdfLoading = true;
    this.svc.getTaskPdf(this.selected.TaskId).subscribe({
      next: (blob) => {
        this.pdfLoading = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => { this.pdfLoading = false; this.toastr.error(this.translate.instant('Tasks.PdfError')); },
    });
  }

  /**
   * The "تصدير / إرفاق" (export/attach) step's artifact is the workflow run's
   * generated document. Download it as a file (the run currently produces a PDF;
   * excel/word formats fall back to PDF until the backend supports them).
   */
  exportStep(s: ResultStep): void {
    if (!this.selected) return;
    const fmt = (s.values?.format || 'pdf').toString().toLowerCase();
    if (fmt !== 'pdf') { this.toastr.info(this.translate.instant('Tasks.ExportPdfOnly')); }
    this.pdfLoading = true;
    this.svc.getTaskPdf(this.selected.TaskId).subscribe({
      next: (blob) => {
        this.pdfLoading = false;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-task-${this.selected!.TaskId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      },
      error: () => { this.pdfLoading = false; this.toastr.error(this.translate.instant('Tasks.PdfError')); },
    });
  }

  /**
   * The "طباعة التقرير" (print) step prints the PRECEDING report itself — it opens
   * that report's page (with the step's params) and asks it to auto-print via the
   * `autoprint=1` query flag, so the printout is the real report, not the run PDF.
   */
  printStep(s: ResultStep): void {
    const idx = this.parsedSteps.indexOf(s);
    let report: ResultStep | undefined;
    for (let i = idx - 1; i >= 0; i--) {
      const st = this.parsedSteps[i];
      const rt = this.stepRoute(st.pageKey);
      if (st.actionType === 'report' || (rt && rt.includes('/reports/'))) { report = st; break; }
    }
    const route = report ? this.stepRoute(report.pageKey) : undefined;
    if (!report || !route) { this.toastr.warning(this.translate.instant('Tasks.NoReportToPrint')); return; }

    const qp: { [k: string]: any } = { autoprint: 1 };
    const v = report.values || {};
    Object.keys(v).forEach(k => { if (v[k] !== '' && v[k] != null) qp[k] = v[k]; });
    const url = this.router.serializeUrl(this.router.createUrlTree([route], { queryParams: qp }));
    window.open(url, '_blank');
  }
}
