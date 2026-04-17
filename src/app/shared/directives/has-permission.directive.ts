import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Usage examples:
 *   <button *hasPermission="'Invoices.Create'">Add</button>
 *   <button *hasPermission="['Invoices.Edit','Invoices.Delete']">Edit</button>
 *   <button *hasPermission="'Invoices.Print'; mode: 'all'">Print</button>
 * mode: 'any' (default) | 'all'
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private keys: string[] = [];
  private mode: 'any' | 'all' = 'any';
  private rendered = false;
  private sub?: Subscription;

  constructor(
    private tpl: TemplateRef<any>,
    private vcr: ViewContainerRef,
    private auth: AuthService
  ) {}

  @Input() set hasPermission(value: string | string[]) {
    this.keys = Array.isArray(value) ? value : (value ? [value] : []);
    this.update();
  }

  @Input() set hasPermissionMode(mode: 'any' | 'all') {
    this.mode = mode || 'any';
    this.update();
  }

  ngOnInit(): void {
    // re-evaluate if the user object changes (login, refreshPermissions)
    this.sub = this.auth.currentUser$.subscribe(() => this.update());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private update(): void {
    const ok = this.mode === 'all'
      ? this.auth.hasAllPermissions(this.keys)
      : this.auth.hasAnyPermission(this.keys);

    if (ok && !this.rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this.rendered = true;
    } else if (!ok && this.rendered) {
      this.vcr.clear();
      this.rendered = false;
    }
  }
}
