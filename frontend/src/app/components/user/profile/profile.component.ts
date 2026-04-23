import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  protected readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected submitting = false;
  protected successMessage = '';
  protected errorMessage = '';
  protected readonly form = this.formBuilder.nonNullable.group({
    nombre_usuario: [this.authService.userProfile()?.nombre_usuario || this.authService.authUser()?.username || '', Validators.required],
    email: [this.authService.userProfile()?.email || this.authService.authUser()?.email || '', [Validators.required, Validators.email]],
    password: [''],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    if (!payload.password.trim()) {
      delete (payload as Partial<typeof payload>).password;
    }

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.updateCurrentUserProfile(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = 'Datos actualizados.';
        this.form.controls.password.setValue('');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting = false;
        this.errorMessage = this.resolveErrorMessage(error);
      },
    });
  }

  protected hasControlError(controlName: 'nombre_usuario' | 'email'): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.invalid;
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

    return 'No se pudo actualizar la cuenta.';
  }
}
