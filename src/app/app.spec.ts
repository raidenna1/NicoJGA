import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.setItem('introSeen', 'true');
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    sessionStorage.removeItem('introSeen');
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the dashboard, schedule and wheel tabs', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const tabLabels = Array.from(compiled.querySelectorAll('.tab')).map((el) => el.textContent?.trim());
    expect(tabLabels).toEqual(['Dashboard', 'Zeitplan', 'Rad']);
  });
});
