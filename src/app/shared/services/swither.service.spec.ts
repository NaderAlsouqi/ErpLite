import { TestBed } from '@angular/core/testing';

import { SwitherService } from './swither.service';

describe('SwitherService', () => {
  let service: SwitherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SwitherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
