import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModalModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgbModalModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ConfirmationModalComponent implements OnInit {
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() confirmButtonText: string = 'Confirm';
  @Input() cancelButtonText: string = 'Cancel';
  @Input() confirmButtonClass: string = 'btn-danger';
  @Input() details: { label: string, value: string }[] = [];
  @Input() processing: boolean = false;
  @Input() processingText: string = 'Processing...';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('confirmationContent') confirmationContent!: TemplateRef<any>;

  private modalRef: NgbModalRef | null = null;

  constructor(private modalService: NgbModal) {}

  ngOnInit(): void {}

  show(): void {
    this.modalRef = this.modalService.open(this.confirmationContent, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
      size: 'sm',
      windowClass: 'delete-confirm-dialog',
    });
  }

  hide(): void {
    this.modalRef?.close();
  }

  onConfirm(): void {
    this.hide();
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
    this.hide();
  }
}
