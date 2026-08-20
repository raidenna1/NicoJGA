import { Component, output } from '@angular/core';

@Component({
  selector: 'app-intro',
  imports: [],
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro {
  readonly start = output<void>();
}
