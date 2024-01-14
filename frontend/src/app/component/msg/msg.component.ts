import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-msg',
  templateUrl: './msg.component.html',
  styleUrls: ['./msg.component.css']
})
export class MsgComponent {
  @Input() msg: string | undefined;
  @Output() close = new EventEmitter<void>();

  closeAlert() {
    this.close.emit();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === 'Escape') {
      this.closeAlert();
    }
  }
}
