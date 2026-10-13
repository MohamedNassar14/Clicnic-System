import { Component, Input, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS } from '../../icons/icon';

@Component({
  selector: 'app-icons',
  imports: [],
  templateUrl: './icons.html',
  styleUrl: './icons.scss',
})
export class Icons {
    constructor(private sanitizer: DomSanitizer) { }

  @Input() iconKey!: string;
  iconSVG: SafeHtml = '';

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['iconKey']) {
      const rawSvg = ICONS[this.iconKey] || '';
      this.iconSVG = this.sanitizer.bypassSecurityTrustHtml(rawSvg);
    }
  }
}
