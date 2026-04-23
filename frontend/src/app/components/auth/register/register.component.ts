import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const passwordConfirm = control.get('password_confirm')?.value;

  if (!password || !passwordConfirm) {
    return null;
  }

  return password === passwordConfirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected submitting = false;
  protected errorMessage = '';
  protected readonly form = this.formBuilder.nonNullable.group(
    {
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required, Validators.minLength(8)]],
    },
    {
      validators: [passwordMatchValidator],
    },
  );

  protected submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.errorMessage = 'Revisa los campos marcados.';
      }
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.authService.register(this.form.getRawValue() as never).subscribe({
      next: async () => {
        await this.router.navigate(['/dashboard']);
        this.submitting = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.resolveErrorMessage(error);
        this.submitting = false;
      },
    });
  }

  protected hasControlError(controlName: 'username' | 'email' | 'password' | 'password_confirm', errorCode?: string): boolean {
    const control = this.form.get(controlName);
    if (!control || !control.touched) {
      return false;
    }

    return errorCode ? control.hasError(errorCode) : control.invalid;
  }

  protected hasPasswordMismatch(): boolean {
    const passwordConfirm = this.form.get('password_confirm');
    return Boolean(passwordConfirm?.touched && this.form.hasError('passwordMismatch'));
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }

    if (error.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error)[0];
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
        return firstValue[0];
      }
      if (typeof firstValue === 'string') {
        return firstValue;
      }
    }

    return 'No se pudo completar el registro.';
  }
}
