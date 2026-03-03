import { TestBed } from '@angular/core/testing';

import { ResellerNotesService } from './reseller.notes.service';

describe('ResellerNotesService', () => {
  let service: ResellerNotesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResellerNotesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
