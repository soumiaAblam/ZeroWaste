import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected submitting = false;
  protected errorMessage = '';
  protected readonly form = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.authService.login(this.form.getRawValue() as { username: string; password: string }).subscribe({
      next: async () => {
        await this.router.navigate(['/dashboard']);
        this.submitting = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = typeof error.error?.detail === 'string' ? error.error.detail : 'No se pudo iniciar sesion.';
        this.submitting = false;
      },
    });
  }
}
