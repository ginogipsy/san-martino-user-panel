import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly authService = inject(Auth);
  private readonly router = inject(Router);

  get username(): string {
    return this.authService.getUsername();
  }

  get roles(): string[] {
    return this.authService.getUserRoles();
  }

  roleBadgeLabel(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN':
        return 'Amministratore';
      case 'ROLE_STAND_OWNER':
        return 'Gestore Cantina';
      case 'ROLE_MODERATOR':
        return 'Moderatore';
      default:
        return role;
    }
  }

  async onLogout() {
    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
