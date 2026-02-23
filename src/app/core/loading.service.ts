import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  begin() {
    this.pending += 1;
    if (this.pending === 1) {
      this.loadingSubject.next(true);
    }
  }

  end() {
    if (this.pending <= 0) {
      this.pending = 0;
      this.loadingSubject.next(false);
      return;
    }
    this.pending -= 1;
    if (this.pending === 0) {
      this.loadingSubject.next(false);
    }
  }
}
