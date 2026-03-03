import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../shared/services/auth.service';
import { SharedModule } from "../../../shared/common/sharedmodule";


// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

// NgSelect import
import { NgSelectModule } from '@ng-select/ng-select';

// NgbModal imports
import { NgbModal, NgbModalConfig, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';

// Material DatePicker imports with custom format
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';


import { ResellerNotesService, NoteDto, GetNotesDto, InsertNoteDto, NotesResponse } from '../../../shared/services/reseller.notes.service';
import { ReportService } from '../../../shared/services/report.service';



// Define custom date formats
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};


@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    NgSelectModule,
    MatDatepickerModule,
    MatInputModule,
    NgbTooltipModule,
    NgbPopoverModule,
    MatNativeDateModule
    
  ],
  providers: [
    NgbModalConfig, 
    NgbModal,
    DatePipe,
    // Add these providers to override the default date format
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }  // Use en-GB locale for dd/MM/yyyy format
  ],

  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss'
})





export class NotesComponent implements OnInit {

  // User info
  deliveryId: number | 0 = 0;
  
   // Data
  NotesData: NotesResponse[] = [];
  filteredNotes: NotesResponse[] = [];

  getNotesParams: GetNotesDto = { manId: this.deliveryId, name: '', phone: '', email: '',status_id :0 };

  // Table configuration
  displayedColumns: string[] = ['Name','Subject', 'Note', 'Phone', 'Email','actions'];
  dataSourceNotes = new MatTableDataSource<NotesResponse>([]);



  // Form fields
  startDate: string = '';
  endDate: string = '';


    // State
  loading: boolean = false;
  searched: boolean = false;
  modalRef!: NgbModalRef;

  startDateModel: Date | null = null;
  endDateModel: Date | null = null;

  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  
  constructor(
    private datePipe: DatePipe,
    private translate: TranslateService,
    private toastr: ToastrService,
    private authService: AuthService,
    private resellerNotesService: ResellerNotesService,
    private modalService: NgbModal,
    private reportService: ReportService,
    private dateAdapter: DateAdapter<Date>
  ) {
    // Set the locale for the date adapter
    this.dateAdapter.setLocale('en-GB');
  }




  ngOnInit(): void {
    debugger;
    this.setupUserData();
    if (this.deliveryId!=null) {
      this.loadNotes();

    } else {
      this.toastr.error(
        this.translate.instant('General.UserInfoNotFound'),
        this.translate.instant('General.Error')
      );
    }  
  }


    private setupUserData(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user.DeliveryID;
    }
  }



  onStartDateChange(event: any): void {
    if (event.value) {
      const date = new Date(event.value);
      this.startDate = this.datePipe.transform(date, 'yyyy-MM-dd') as string;
    }
  }

  onEndDateChange(event: any): void {
    if (event.value) {
      const date = new Date(event.value);
      this.endDate = this.datePipe.transform(date, 'yyyy-MM-dd') as string;
    }
  }


  search()
  {
    debugger;
      const request: GetNotesDto = {
            manId: this.deliveryId,
            name: this.newNote.Name,
            phone: this.newNote.Phone,
            email: this.newNote.Email,
            status_id: 0,
        };        
    this.getNotesParams = request;        
    this.loadNotes();
  }


    /**
   * Apply filter to data source
   */
  applyFilter(): void {   
    this.search();
  }

    newNote: NoteDto = {
      NoteId:0,
      Man_id:0,
      Name: '',
      Subject: '',
      Note: '',
      Phone: '',
      Email: '',
    };

  addNote()
  {
  
    // Existing validation
    if (!this.newNote.Name || 
        !this.newNote.Subject || 
        !this.newNote.Note || 
        !this.newNote.Phone ||
        !this.newNote.Email) {
      this.toastr.warning(
        this.translate.instant('General.ValidationError')
      );
      return;
    }

      this.loading = true;
      const user = this.authService.currentUserValue;
      const note: InsertNoteDto = {
        manId : user?.DeliveryID,
        name: this.newNote.Name,
        subject: this.newNote.Subject,
        note: this.newNote.Note,
        phone: this.newNote.Phone,
        email: this.newNote.Email,
      }

      this.resellerNotesService.insertNote(note).subscribe({
        next: () => {
          this.toastr.success(
            this.translate.instant('NotesPage.AddNoteSuccess'),
            this.translate.instant('General.Success')
          );
          this.loadNotes();
          this.resetForm();
          this.loading = false;
        },
        error: () => {
          // Error handling done by service
          this.loading = false;
        }
      });
    }   
  

   resetForm(): void {
    this.newNote = {
      NoteId:0,
      Man_id:0,
      Name: '',
      Subject: '',
      Note: '',
      Phone: '',
      Email: '', 
    };
  }


    loadNotes(): void {
    this.resellerNotesService.getNotes(this.getNotesParams).subscribe({
      next: (data) => {
        this.NotesData = data;
        this.filteredNotes = [...data]; // Update the source for ng2-smart-table
        this.loading = false;
      },
      error: (err) => console.error('Error fetching notes:', err),
    });
  }


    /**
   * Filter Notes based on search term
   
  filterNotes(): void {
    const searchTerm = this.customerSearchTerm.toLowerCase();
    this.filteredNotes = this.NotesData.filter(
      (NotesData) =>
        NotesData.Email.toLowerCase().includes(searchTerm) ||
        customer.CustomerAccountNumber.toString().includes(searchTerm)
    );
  }

  */


    /**
   * Comparison function for sorting
   */
  private compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
    /**
   * Handle sort change event with proper date comparison
   */
  onSortChange(sortState: Sort): void {
    // Handle sorting logic
    if (sortState.direction) {

      
      // Reset to first page when sorting
      this.pageIndex = 0;
      
      // Apply pagination with the sorted data
      this.applyPagination();
    }
  }


    /**
   * Apply pagination to the data
   */
  private applyPagination(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    // Update the data source with the paginated data
   // this.dataSource.data = this.allData.slice(startIndex, endIndex);
  }

  /**
   * Open cheque modal dialog using NgbModal
   */
  openNoteModal(content: any): void {
    this.resetForm();
    this.modalRef = this.modalService.open(content, {
      centered: true,
      size: 'lg',
      backdrop: 'static',
      windowClass: 'animate__animated animate__fadeIn'
    });
  }


  /**
   * Close modal dialog
   */
  closeModal(): void {
    this.modalRef?.close();
  }



    /**
   * Handle page change event
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    
    // Apply pagination with the new page parameters
    this.applyPagination();
  }



   PrintNotesReport(): void {
    debugger;
    this.loading = true;
    
    this.reportService.DeliveryNotesReport(this.getNotesParams).subscribe({ 
      next: (response: Blob) => {
        const blobUrl = window.URL.createObjectURL(response);
        window.open(blobUrl);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error printing notes report:', error);
        this.toastr.error(
          this.translate.instant('VirtualTransferredInvoicesPage.PrintError'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
      }


      printNote(Id : number)
      {
        this.loading = true;
        this.reportService.DeliveryNoteByIdReport(Id).subscribe({ 
          next: (response: Blob) => {
            const blobUrl = window.URL.createObjectURL(response);
            window.open(blobUrl);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error printing notes report:', error);
            this.toastr.error(
              this.translate.instant('VirtualTransferredInvoicesPage.PrintError'),
              this.translate.instant('General.Error')
            );
            this.loading = false;
          }
        });
      }



}
