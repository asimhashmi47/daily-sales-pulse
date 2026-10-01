import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, friendlyError, todayString } from './api.service';

const MAX_AMOUNT = 1_000_000_000;

export function validDate(c: AbstractControl): ValidationErrors | null {
  const v = c.value as string;
  if (!v) return null; // "required" handles empty
  const d = new Date(`${v}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? null : { date: true };
}

@Component({
  selector: 'app-sale-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page narrow">
      <div>
        <h1>{{ id ? 'Edit sale' : 'Add sale' }}</h1>
        <p class="muted">Record what you sold. It takes a few seconds.</p>
      </div>

      <form class="card form" [formGroup]="form" (ngSubmit)="save()" novalidate>
        @if (error()) { <div class="error-box" role="alert">{{ error() }}</div> }

        <div class="field">
          <label for="date">Date</label>
          <input id="date" type="date" formControlName="date" [class.invalid]="show('date')" [attr.aria-invalid]="show('date')" />
          @if (show('date')) { <span class="field-error">{{ form.controls.date.hasError('required') ? 'Please pick a date.' : 'That doesn\\'t look like a valid date.' }}</span> }
        </div>

        <div class="field">
          <label for="amount">Sales amount</label>
          <input id="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="e.g. 850" formControlName="amount" [class.invalid]="show('amount')" [attr.aria-invalid]="show('amount')" />
          @if (show('amount')) {
            <span class="field-error">
              @if (form.controls.amount.hasError('required')) { Enter today's sales amount. }
              @else if (form.controls.amount.hasError('min')) { Sales can't be negative. }
              @else { Please enter a reasonable amount (up to 1,000,000,000). }
            </span>
          }
        </div>

        <div class="field">
          <label for="note">Note <span class="muted">(optional)</span></label>
          <textarea id="note" rows="3" maxlength="200" placeholder="e.g. Good afternoon sales" formControlName="note"></textarea>
          <span class="hint">{{ form.controls.note.value?.length ?? 0 }}/200</span>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Sale' }}</button>
          <a class="btn btn-ghost" routerLink="/sales">Cancel</a>
        </div>
      </form>
    </section>
  `,
  styles: `
    .narrow { max-width: 560px; }
    .form { display: grid; gap: 1.1rem; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  `,
})
export class SaleFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;

  saving = signal(false);
  error = signal('');

  form = this.fb.group({
    date: [todayString(), [Validators.required, validDate]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(MAX_AMOUNT)]),
    note: this.fb.control('', [Validators.maxLength(200)]),
  });

  ngOnInit(): void {
    if (!this.id) return;
    this.api.sale(this.id).subscribe({
      next: (s) => this.form.patchValue({ date: s.date, amount: s.amount, note: s.note ?? '' }),
      error: (e) => this.error.set(friendlyError(e)),
    });
  }

  show(name: 'date' | 'amount'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const input = { date: v.date!, amount: Number(v.amount), note: v.note?.trim() || null };
    this.saving.set(true);
    this.error.set('');
    const req = this.id ? this.api.updateSale(this.id, input) : this.api.createSale(input);
    req.subscribe({
      next: () => {
        this.snack.open(this.id ? 'Sale updated.' : 'Sale saved.', 'OK', { duration: 3000, panelClass: 'snack-ok' });
        this.router.navigateByUrl('/sales');
      },
      error: (e) => { this.saving.set(false); this.error.set(friendlyError(e)); },
    });
  }
}
