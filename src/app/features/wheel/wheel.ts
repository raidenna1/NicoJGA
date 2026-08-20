import { Component, computed, input, output, signal } from '@angular/core';
import { WheelEntry } from '../../core/models/wheel-entry';

const SPIN_DURATION_MS = 4000;
const EXTRA_SPINS = 5;
const SEGMENT_COLORS = ['#0ac8b9', '#c8aa6e', '#e0473a', '#2ecc71'];

interface WheelSegment {
  entry: WheelEntry;
  start: number;
  end: number;
  mid: number;
}

@Component({
  selector: 'app-wheel',
  imports: [],
  templateUrl: './wheel.html',
  styleUrl: './wheel.scss',
})
export class Wheel {
  readonly entries = input.required<WheelEntry[]>();
  readonly spinResult = output<WheelEntry>();

  protected readonly rotation = signal(0);
  protected readonly spinning = signal(false);

  protected readonly segments = computed<WheelSegment[]>(() => {
    const list = this.entries();
    if (list.length === 0) {
      return [];
    }
    const segAngle = 360 / list.length;
    return list.map((entry, i) => ({
      entry,
      start: i * segAngle,
      end: (i + 1) * segAngle,
      mid: i * segAngle + segAngle / 2,
    }));
  });

  protected readonly conicGradient = computed(() => {
    const segs = this.segments();
    if (segs.length === 0) {
      return 'transparent';
    }
    const stops = segs.map(
      (seg, i) => `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${seg.start}deg ${seg.end}deg`,
    );
    return `conic-gradient(${stops.join(', ')})`;
  });

  protected spin(): void {
    const segs = this.segments();
    if (segs.length === 0 || this.spinning()) {
      return;
    }
    const targetIndex = Math.floor(Math.random() * segs.length);
    const targetMid = segs[targetIndex].mid;
    const normalizedCurrent = ((this.rotation() % 360) + 360) % 360;
    const rawDelta = 360 - targetMid - normalizedCurrent;
    const delta = ((rawDelta % 360) + 360) % 360;

    this.spinning.set(true);
    // rotation only ever grows - never normalized - so the wheel always spins forward,
    // never visibly snaps backward on the next spin.
    this.rotation.update((current) => current + delta + EXTRA_SPINS * 360);

    setTimeout(() => {
      this.spinning.set(false);
      this.spinResult.emit(segs[targetIndex].entry);
    }, SPIN_DURATION_MS);
  }
}
