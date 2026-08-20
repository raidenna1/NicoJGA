import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChallengeEditor } from './challenge-editor';

describe('ChallengeEditor', () => {
  let component: ChallengeEditor;
  let fixture: ComponentFixture<ChallengeEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
