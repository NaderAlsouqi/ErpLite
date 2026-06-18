import { Injectable, Injector } from '@angular/core';
import {
  Overlay,
  OverlayRef,
  ConnectedPosition,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CalculatorComponent } from '../components/calculator/calculator.component';

/**
 * Opens a floating calculator (CalculatorComponent) anchored to a numeric
 * input and writes the computed result back into it.
 *
 * Triggered globally by F2 (see AppComponent) — no per-component wiring needed.
 */
@Injectable({ providedIn: 'root' })
export class CalculatorService {
  private overlayRef: OverlayRef | null = null;
  private target: HTMLInputElement | null = null;

  private readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top',    offsetY: 6 },
    { originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
    { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'top',    offsetY: 6 },
    { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'bottom', offsetY: -6 },
  ];

  constructor(private overlay: Overlay, private injector: Injector) {}

  isOpen(): boolean { return !!this.overlayRef; }

  open(input: HTMLInputElement): void {
    this.close();
    this.target = input;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(input)
      .withPositions(this.positions)
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const portal = new ComponentPortal(CalculatorComponent, null, this.injector);
    const ref = this.overlayRef.attach(portal);

    // Seed with the field's current value (digits only).
    const seed = (input.value ?? '').toString().trim();
    ref.instance.initial = /^-?\d*\.?\d+$/.test(seed) ? seed : '';

    ref.instance.applied.subscribe((result: string) => {
      this.writeBack(result);
      this.close();
    });
    ref.instance.closed.subscribe(() => this.close());

    this.overlayRef.backdropClick().subscribe(() => this.close());
  }

  close(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    const t = this.target;
    this.target = null;
    // Return focus to the field for a smooth flow.
    if (t) setTimeout(() => t.focus(), 0);
  }

  /** Write the result into the input and fire input+change so Angular forms react. */
  private writeBack(result: string): void {
    const input = this.target;
    if (!input) return;
    input.value = result;
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
