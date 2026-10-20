import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';
import { Icons } from '../../shared/components/icons/icons';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icons],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly isDoctor = this.auth.getUserRole() === '2';

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/auth/admin-login']);
  }

}
