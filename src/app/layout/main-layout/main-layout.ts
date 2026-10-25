import { Component, inject } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Auth } from '../../features/auth/services/auth';

@Component({
  selector: 'app-main-layout',
  imports: [Sidebar,Header, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly isDoctor = inject(Auth).getUserRole() === '2';
}
