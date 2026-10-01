import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService, CURRENCIES, Currency, friendlyError } from './api.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page narrow">
      <div>
        <h1>Settings</h1>
        <p class="muted">Set your daily target and currency.</p>
      </div>

      @if (loading()) {
        <div class="skeleton" style="height: 240px" aria-busy="true"></div>
      } @else {
        <form class="card form" [formGroup]="form" (ngSubmit)="save()" novalidate>
          @if (error()) { <div class="error-box" role="alert">{{ error() }}</div> }

          <div class="field">
            <label for="target">Daily target</label>
            <input id="target" type="number" inputmode="decimal" min="0" step="0.01" formControlName="dailyTarget" [class.invalid]="invalid()" [attr.aria-invalid]="invalid()" />
            @if (invalid()) { <span class="field-error">Enter a target of 0 or more (up to 1,000,000,000).</span> }
            <span class="hint">Today's sales are compared against this amount.</span>
          </div>

          <div class="field">
            <label for="currency">Currency</label>
            <select id="currency" formControlName="currency">
              @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>

          <div class="actions"><button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save settings' }}</button></div>
        </form>
      }
    </section>
  `,
  styles: `.narrow { max-width: 560px; } .form { display: grid; gap: 1.1rem; }`,
})
export class SettingsPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  currencies = CURRENCIES;
  loading = signal(true);
  saving = signal(false);
  error = signal('');

  form = this.fb.group({
    dailyTarget: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(1_000_000_000)]),
    currency: this.fb.control<Currency>('USD'),
  });

  ngOnInit(): void {
    this.api.settings().subscribe({
      next: (s) => { this.form.patchValue(s); this.loading.set(false); },
      error: (e) => { this.error.set(friendlyError(e)); this.loading.set(false); },
    });
  }

  invalid(): boolean {
    const c = this.form.controls.dailyTarget;
    return c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.api.updateSettings({ dailyTarget: Number(v.dailyTarget), currency: v.currency ?? "USD" }).subscribe({
      next: () => { this.saving.set(false); this.snack.open('Settings saved.', 'OK', { duration: 3000, panelClass: 'snack-ok' }); },
      error: (e) => { this.saving.set(false); this.error.set(friendlyError(e)); },
    });
  }
}
