import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import {
  WorkflowService, Workflow, WorkflowStep, WorkflowListRow, WorkflowUser, CatalogItem, CatalogParam
} from '../../../shared/services/workflow.service';
import { NavService } from '../../../shared/services/navservice';

interface CatalogGroup { module: string; moduleAr: string; items: CatalogItem[]; }

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, DragDropModule, SharedModule, HasPermissionDirective, ConfirmationModalComponent],
  templateUrl: './workflow-builder.component.html',
  styleUrls: ['./workflow-builder.component.scss'],
})
export class WorkflowBuilderComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  activeTab: 'builder' | 'list' = 'builder';
  readonly currentYear = new Date().getFullYear();

  current: Workflow = this.init();
  isExisting = false;
  saving = false;
  running = false;

  users: WorkflowUser[] = [];
  paletteSearch = '';
  allGroups: CatalogGroup[] = [];

  workflows: WorkflowListRow[] = [];
  listLoading = false;
  listLoaded = false;
  pendingDeleteId: number | null = null;

  constructor(
    private svc: WorkflowService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    private nav: NavService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  /** Catalog item display title (auto pages carry an i18n key). */
  catTitle(c: CatalogItem): string {
    return c.titleKey ? this.translate.instant(c.titleKey) : (this.isAr ? c.titleAr : c.titleEn);
  }

  /** Type-ahead over both username and full name (the 63-user list needs search). */
  userSearch = (term: string, item: WorkflowUser): boolean => {
    const t = (term || '').toLowerCase();
    return (item.UserName || '').toLowerCase().includes(t) || (item.FullName || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    // Pull in every nav page (curated + any future ones) then group the palette.
    this.svc.syncCatalogFromNav(this.nav.MENUITEMS);
    this.buildGroups();
    this.svc.getUsers().subscribe({ next: (u) => (this.users = u || []), error: () => {} });
  }

  private buildGroups(): void {
    const map = new Map<string, CatalogGroup>();
    for (const c of this.svc.catalog) {
      if (!map.has(c.module)) map.set(c.module, { module: c.module, moduleAr: c.moduleAr, items: [] });
      map.get(c.module)!.items.push(c);
    }
    this.allGroups = Array.from(map.values());
  }

  /** Palette groups filtered by the search box. */
  get groups(): CatalogGroup[] {
    const q = this.paletteSearch.trim().toLowerCase();
    if (!q) return this.allGroups;
    return this.allGroups
      .map(g => ({ ...g, items: g.items.filter(i => (i.titleEn + ' ' + i.titleAr + ' ' + i.key).toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }

  get canvasIds(): string[] { return ['wfCanvas']; }

  // ─── friendly schedule builder (generates the cron) ─────────
  schedFreq: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily';
  schedTime = '08:00';
  schedDow = 1;   // 0=Sun … 6=Sat
  schedDom = 1;
  readonly weekdays = [
    { v: 6, ar: 'السبت', en: 'Saturday' }, { v: 0, ar: 'الأحد', en: 'Sunday' },
    { v: 1, ar: 'الاثنين', en: 'Monday' }, { v: 2, ar: 'الثلاثاء', en: 'Tuesday' },
    { v: 3, ar: 'الأربعاء', en: 'Wednesday' }, { v: 4, ar: 'الخميس', en: 'Thursday' },
    { v: 5, ar: 'الجمعة', en: 'Friday' },
  ];
  readonly monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  private applyCron(): void {
    const [hh, mm] = (this.schedTime || '08:00').split(':');
    const m = Number(mm) || 0, h = Number(hh) || 0;
    if (this.schedFreq === 'daily')   this.current.ScheduleCron = `${m} ${h} * * *`;
    else if (this.schedFreq === 'weekly')  this.current.ScheduleCron = `${m} ${h} * * ${this.schedDow}`;
    else if (this.schedFreq === 'monthly') this.current.ScheduleCron = `${m} ${h} ${this.schedDom} * *`;
    // 'custom' → user edits ScheduleCron directly
  }
  onSchedChange(): void { this.applyCron(); }
  onTriggerChange(): void {
    if (this.current.TriggerType === 'Scheduled') {
      if (this.current.ScheduleCron && this.current.ScheduleCron.trim()) this.parseCron();
      else this.applyCron();
    }
  }
  private parseCron(): void {
    const parts = (this.current.ScheduleCron || '').trim().split(/\s+/);
    if (parts.length !== 5) { this.schedFreq = 'custom'; return; }
    const [m, h, dom, , dow] = parts;
    this.schedTime = `${String(Number(h) || 0).padStart(2, '0')}:${String(Number(m) || 0).padStart(2, '0')}`;
    if (dom === '*' && dow === '*') this.schedFreq = 'daily';
    else if (dom === '*' && dow !== '*') { this.schedFreq = 'weekly'; this.schedDow = Number(dow) || 1; }
    else if (dom !== '*' && dow === '*') { this.schedFreq = 'monthly'; this.schedDom = Number(dom) || 1; }
    else this.schedFreq = 'custom';
  }
  scheduleSummary(): string {
    const time = this.schedTime || '08:00';
    if (this.schedFreq === 'custom') return this.translate.instant('Workflow.Sched.CustomHint');
    if (this.schedFreq === 'daily')  return this.translate.instant('Workflow.Sched.SumDaily', { time });
    if (this.schedFreq === 'weekly') {
      const d = this.weekdays.find(x => x.v === this.schedDow);
      return this.translate.instant('Workflow.Sched.SumWeekly', { day: (this.isAr ? d?.ar : d?.en) || '', time });
    }
    return this.translate.instant('Workflow.Sched.SumMonthly', { day: this.schedDom, time });
  }

  // ─── build helpers ──────────────────────────────────────────
  private init(): Workflow {
    return { WorkflowId: null, Name: '', Description: '', Status: 'Draft', TriggerType: 'Manual', ScheduleCron: '', AssignedTo: null, AssignedToName: '', Steps: [] };
  }

  private defaultValues(params?: CatalogParam[]): { [k: string]: any } {
    const v: { [k: string]: any } = {};
    (params || []).forEach(p => {
      if (p.default !== undefined) v[p.name] = p.default;
      else if (p.type === 'year') v[p.name] = this.currentYear;
      else v[p.name] = '';
    });
    return v;
  }

  private stepFromCatalog(cat: CatalogItem): WorkflowStep {
    return {
      PageKey: cat.key,
      PageTitle: this.catTitle(cat),
      ActionType: cat.actionType,
      icon: cat.icon,
      module: cat.module,
      moduleAr: cat.moduleAr,
      params: cat.params ? cat.params.map(p => ({ ...p })) : [],
      values: this.defaultValues(cat.params),
      expanded: !!(cat.params && cat.params.length),
    };
  }

  stepTitle(s: WorkflowStep): string {
    const cat = this.svc.catalog.find(c => c.key === s.PageKey);
    if (cat) return this.catTitle(cat);
    return s.PageTitle || s.PageKey;
  }

  paramLabel(p: CatalogParam): string { return this.isAr ? p.labelAr : p.labelEn; }
  optionLabel(o: { labelAr: string; labelEn: string }): string { return this.isAr ? o.labelAr : o.labelEn; }

  /** Actions a step can carry. Data-entry pages (base 'open') support the full
   *  CRUD set; reports / control steps keep their single inherent action. */
  private readonly crudActions = ['open', 'save', 'edit', 'delete'];
  actionOptions(s: WorkflowStep): string[] {
    const cat = this.svc.catalog.find(c => c.key === s.PageKey);
    if (cat?.entity) return ['list', 'save', 'edit', 'delete'];   // master data auto-executes
    if (cat?.doc) return ['add', 'edit', 'delete'];               // GL document → open-in-mode
    if (s.PageKey?.startsWith('page:')) return ['open'];          // auto-derived page → open only
    const base = cat?.actionType || s.ActionType || 'open';
    return base === 'open' ? this.crudActions : [base];
  }

  /** Open a document/report step's real page in its action mode (add=new, edit/delete=by no). */
  openStep(s: WorkflowStep): void {
    const cat = this.svc.catalog.find(c => c.key === s.PageKey);
    if (!cat?.route) return;
    const qp: { [k: string]: any } = {};
    const v = s.values || {};
    Object.keys(v).forEach(k => { if (v[k] !== '' && v[k] != null) qp[k] = v[k]; });
    if (s.ActionType === 'add') delete qp['docNum'];   // add = a brand-new document
    const url = this.router.serializeUrl(this.router.createUrlTree([cat.route], { queryParams: qp }));
    window.open(url, '_blank');
  }
  hasRoute(s: WorkflowStep): boolean { return !!this.svc.catalog.find(c => c.key === s.PageKey)?.route; }

  /** بوابة اعتماد / اعتماد وترحيل steps carry their own approver assignee. */
  isApprovalStep(s: WorkflowStep): boolean { return s.ActionType === 'approve' || s.ActionType === 'post'; }
  onAssigneeChange(s: WorkflowStep): void {
    if (!s.values) s.values = {};
    const u = this.users.find(x => x.UserId === s.values!['assigneeId']);
    s.values['assigneeName'] = u ? (u.FullName || u.UserName) : '';
  }

  // ─── drag & drop ────────────────────────────────────────────
  /** Resolve a step's app route (curated catalog route, or auto-page "page:/route"). */
  private stepRouteOf(s: WorkflowStep): string {
    if (s.PageKey?.startsWith('page:')) return s.PageKey.slice(5);
    return this.svc.catalog.find(c => c.key === s.PageKey)?.route || '';
  }
  /** A report step = a curated 'report' action OR any step pointing at a /reports/ page. */
  private isReportStep(s?: WorkflowStep): boolean {
    return !!s && (s.ActionType === 'report' || this.stepRouteOf(s).includes('/reports/'));
  }
  /** An "after report" step (e.g. print) may only sit right after a report step. */
  private afterReportOk(cat: CatalogItem, insertIndex: number): boolean {
    if (!cat.afterReport) return true;
    if (this.isReportStep(this.current.Steps[insertIndex - 1])) return true;
    this.toastr.warning(this.translate.instant('Workflow.PrintAfterReportOnly'));
    return false;
  }

  onCanvasDrop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.current.Steps, event.previousIndex, event.currentIndex);
    } else {
      const cat: CatalogItem = event.previousContainer.data[event.previousIndex];
      if (!cat || !this.afterReportOk(cat, event.currentIndex)) return;
      this.current.Steps.splice(event.currentIndex, 0, this.stepFromCatalog(cat));
    }
  }

  addStep(cat: CatalogItem): void {
    if (!this.afterReportOk(cat, this.current.Steps.length)) return;
    this.current.Steps.push(this.stepFromCatalog(cat));
    this.toastr.info(this.catTitle(cat), '', { timeOut: 900 });
  }

  removeStep(i: number): void { this.current.Steps.splice(i, 1); }
  toggleStep(s: WorkflowStep): void { s.expanded = !s.expanded; }
  moveUp(i: number): void { if (i > 0) moveItemInArray(this.current.Steps, i, i - 1); }
  moveDown(i: number): void { if (i < this.current.Steps.length - 1) moveItemInArray(this.current.Steps, i, i + 1); }

  // ─── tabs / list ────────────────────────────────────────────
  switchTab(t: 'builder' | 'list'): void {
    this.activeTab = t;
    if (t === 'list') this.loadList();
  }

  loadList(): void {
    this.listLoading = true;
    this.svc.listWorkflows().subscribe({
      next: (r) => { this.workflows = r || []; this.listLoaded = true; this.listLoading = false; },
      error: () => { this.listLoading = false; },
    });
  }

  newWorkflow(): void {
    this.current = this.init(); this.isExisting = false; this.activeTab = 'builder';
    this.schedFreq = 'daily'; this.schedTime = '08:00'; this.schedDow = 1; this.schedDom = 1;
  }

  loadWorkflow(id: number): void {
    this.svc.getWorkflow(id).subscribe({
      next: (wf) => {
        wf.Steps = (wf.Steps || []).map(s => {
          const cat = this.svc.catalog.find(c => c.key === s.PageKey);
          let values: any = {};
          try { values = s.ParametersJson ? JSON.parse(s.ParametersJson) : {}; } catch { values = {}; }
          return {
            ...s,
            icon: cat?.icon, module: cat?.module, moduleAr: cat?.moduleAr,
            params: cat?.params ? cat.params.map(p => ({ ...p })) : [],
            values, expanded: false,
          } as WorkflowStep;
        });
        this.current = wf;
        this.isExisting = true;
        this.activeTab = 'builder';
        if (wf.TriggerType === 'Scheduled') this.parseCron();
      },
      error: () => this.toastr.error(this.translate.instant('Workflow.LoadError')),
    });
  }

  // ─── save / run / delete ───────────────────────────────────
  private serialize(): Workflow {
    const assignee = this.users.find(u => u.UserId === this.current.AssignedTo);
    return {
      ...this.current,
      AssignedToName: assignee ? (assignee.FullName || assignee.UserName) : this.current.AssignedToName,
      Steps: this.current.Steps.map((s, idx) => ({
        StepId: s.StepId,
        StepOrder: idx + 1,
        PageKey: s.PageKey,
        PageTitle: this.stepTitle(s),
        ActionType: s.ActionType || 'open',
        ParametersJson: JSON.stringify(s.values || {}),
        Notes: s.Notes,
      })),
    };
  }

  save(): void {
    if (!this.current.Name || !this.current.Name.trim()) { this.toastr.warning(this.translate.instant('Workflow.NameRequired')); return; }
    if (!this.current.Steps.length) { this.toastr.warning(this.translate.instant('Workflow.StepsRequired')); return; }
    this.saving = true;
    this.svc.saveWorkflow(this.serialize()).subscribe({
      next: (r: any) => {
        // API may serialize the anonymous response as either casing depending on build
        this.current.WorkflowId = r?.WorkflowId ?? r?.workflowId ?? this.current.WorkflowId;
        this.isExisting = true;
        this.saving = false;
        this.toastr.success(this.translate.instant('Workflow.Saved'));
        this.listLoaded = false;
      },
      error: (e) => { this.saving = false; this.toastr.error(e?.error?.message || this.translate.instant('Workflow.SaveError')); },
    });
  }

  run(): void {
    if (!this.current.WorkflowId) { this.toastr.warning(this.translate.instant('Workflow.SaveBeforeRun')); return; }
    if (!this.current.AssignedTo) { this.toastr.warning(this.translate.instant('Workflow.AssigneeRequired')); return; }
    this.running = true;
    const snapshot = {
      workflowName: this.current.Name,
      triggerType: this.current.TriggerType,
      steps: this.current.Steps.map((s, i) => ({
        order: i + 1,
        title: this.stepTitle(s),
        actionType: s.ActionType,
        pageKey: s.PageKey,
        values: s.values || {},
        status: 'generated',
      })),
    };
    this.svc.runWorkflow({ WorkflowId: this.current.WorkflowId, Title: this.current.Name, Priority: 'Normal', ResultJson: JSON.stringify(snapshot) }).subscribe({
      next: (r: any) => {
        this.running = false;
        this.toastr.success(this.translate.instant('Workflow.RunCreated', { name: r?.AssignedToName ?? r?.assignedToName ?? '' }));
      },
      error: (e) => { this.running = false; this.toastr.error(e?.error?.message || this.translate.instant('Workflow.RunError')); },
    });
  }

  runFromList(w: WorkflowListRow): void {
    if (!w.AssignedTo) { this.toastr.warning(this.translate.instant('Workflow.AssigneeRequired')); return; }
    this.svc.runWorkflow({ WorkflowId: w.WorkflowId, Title: w.Name, Priority: 'Normal' }).subscribe({
      next: (r: any) => { this.toastr.success(this.translate.instant('Workflow.RunCreated', { name: r?.AssignedToName ?? r?.assignedToName ?? '' })); this.loadList(); },
      error: (e) => this.toastr.error(e?.error?.message || this.translate.instant('Workflow.RunError')),
    });
  }

  askDelete(id: number): void {
    this.pendingDeleteId = id;
    this.confirmModal?.show();
  }

  confirmDelete(): void {
    if (this.pendingDeleteId == null) return;
    const id = this.pendingDeleteId;
    this.svc.deleteWorkflow(id).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('Workflow.Deleted'));
        this.workflows = this.workflows.filter(w => w.WorkflowId !== id);
        if (this.current.WorkflowId === id) this.newWorkflow();
        this.pendingDeleteId = null;
      },
      error: () => { this.pendingDeleteId = null; this.toastr.error(this.translate.instant('Workflow.DeleteError')); },
    });
  }
}
