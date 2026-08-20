import { TestBed } from '@angular/core/testing';

import { WakeLock } from './wake-lock';

describe('WakeLock', () => {
  let service: WakeLock;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WakeLock);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
