import { TestBed } from '@angular/core/testing';

import { ChallengeStore } from './challenge-store';

describe('ChallengeStore', () => {
  let service: ChallengeStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChallengeStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
