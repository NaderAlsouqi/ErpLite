import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import {
  AdminUserDto,
  PermissionMatrixItemDto,
  PermissionService
} from '../../../shared/services/permission.service';
import { AuthService } from '../../../shared/services/auth.service';

interface PermissionGroup {
  module: string;
  items: PermissionMatrixItemDto[];
  allChecked: boolean;
  indeterminate: boolean;
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PermissionsComponent implements OnInit {
  users: AdminUserDto[] = [];
  selectedUserId: number | null = null;
  searchUser = '';
  searchPermission = '';

  matrix: PermissionMatrixItemDto[] = [];
  groups: PermissionGroup[] = [];
  loading = false;
  saving = false;

  constructor(
    private permissionService: PermissionService,
    private authService: AuthService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get filteredUsers(): AdminUserDto[] {
    const q = (this.searchUser || '').toLowerCase().trim();
    if (!q) return this.users;
    return this.users.filter(u =>
      (u.Login_Name || '').toLowerCase().includes(q) ||
      (u.FullName || '').toLowerCase().includes(q)
    );
  }

  loadUsers(): void {
    this.permissionService.getUsers().subscribe({
      next: data => this.users = data || [],
      error: () => this.users = []
    });
  }

  onSelectUser(userId: number): void {
    this.selectedUserId = userId;
    this.loadMatrix();
  }

  loadMatrix(): void {
    if (this.selectedUserId == null) return;
    this.loading = true;
    this.permissionService.getUserPermissionsMatrix(this.selectedUserId).subscribe({
      next: data => {
        this.matrix = data || [];
        this.buildGroups();
        this.loading = false;
      },
      error: () => {
        this.matrix = [];
        this.groups = [];
        this.loading = false;
      }
    });
  }

  private buildGroups(): void {
    const map = new Map<string, PermissionMatrixItemDto[]>();
    for (const p of this.matrix) {
      if (!map.has(p.Module)) map.set(p.Module, []);
      map.get(p.Module)!.push(p);
    }
    this.groups = Array.from(map.entries())
      .map(([module, items]) => ({
        module,
        items,
        allChecked: items.every(i => i.IsGranted),
        indeterminate: items.some(i => i.IsGranted) && !items.every(i => i.IsGranted)
      }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }

  onItemToggle(group: PermissionGroup): void {
    group.allChecked = group.items.every(i => i.IsGranted);
    group.indeterminate = group.items.some(i => i.IsGranted) && !group.allChecked;
  }

  onToggleGroup(group: PermissionGroup): void {
    const newVal = !group.allChecked;
    for (const i of group.items) i.IsGranted = newVal;
    group.allChecked = newVal;
    group.indeterminate = false;
  }

  selectAll(): void {
    for (const g of this.groups) {
      for (const i of g.items) i.IsGranted = true;
      g.allChecked = true;
      g.indeterminate = false;
    }
  }

  clearAll(): void {
    for (const g of this.groups) {
      for (const i of g.items) i.IsGranted = false;
      g.allChecked = false;
      g.indeterminate = false;
    }
  }

  matchesSearch(item: PermissionMatrixItemDto): boolean {
    const q = (this.searchPermission || '').toLowerCase().trim();
    if (!q) return true;
    return (item.DisplayName || '').toLowerCase().includes(q) ||
           (item.PermissionKey || '').toLowerCase().includes(q) ||
           (item.Module || '').toLowerCase().includes(q);
  }

  visibleGroups(): PermissionGroup[] {
    if (!this.searchPermission) return this.groups;
    return this.groups
      .map(g => ({ ...g, items: g.items.filter(i => this.matchesSearch(i)) }))
      .filter(g => g.items.length > 0);
  }

  save(): void {
    if (this.selectedUserId == null) return;
    const ids = this.matrix.filter(m => m.IsGranted).map(m => m.PermissionID);
    this.saving = true;
    this.permissionService.setUserPermissions({
      User_ID: this.selectedUserId,
      PermissionIDs: ids
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(
          this.translate.instant('Permissions.SavedMessage') || 'Permissions saved.',
          this.translate.instant('General.Success') || 'Success'
        );
        // If the edited user is me, refresh my own permissions live.
        const me = this.authService.currentUserValue;
        if (me && me.ID === this.selectedUserId) {
          const keys = this.matrix.filter(m => m.IsGranted).map(m => m.PermissionKey);
          this.authService.refreshPermissions(keys);
        }
      },
      error: () => { this.saving = false; }
    });
  }
}
