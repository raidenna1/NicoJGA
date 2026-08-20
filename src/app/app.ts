import { Component, signal } from '@angular/core';
import { Dashboard } from './features/dashboard/dashboard';
import { Schedule } from './features/schedule/schedule';
import { WheelSettings } from './features/wheel-settings/wheel-settings';
import { Intro } from './features/intro/intro';

type Tab = 'dashboard' | 'schedule' | 'wheel';

const INTRO_PARAM = 'intro';
const INTRO_SESSION_KEY = 'introSeen';

@Component({
  selector: 'app-root',
  imports: [Dashboard, Schedule, WheelSettings, Intro],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Captured once at construction time - must NOT be re-derived from location.search later,
  // since dismissIntro() strips the param from the URL after Start is clicked.
  private readonly forcedIntro = new URLSearchParams(window.location.search).has(INTRO_PARAM);

  protected readonly showIntro = signal(
    this.forcedIntro || sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true',
  );
  protected readonly activeTab = signal<Tab>('dashboard');
  protected readonly isFullscreen = signal(false);

  constructor() {
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(document.fullscreenElement !== null);
    });
  }

  protected dismissIntro(): void {
    sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
    this.showIntro.set(false);
    this.activeTab.set('schedule');
    if (this.forcedIntro) {
      const url = new URL(window.location.href);
      url.searchParams.delete(INTRO_PARAM);
      history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  protected async toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }
}
