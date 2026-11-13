import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './moderation.html',
  styleUrl: './moderation.css',
})
export class Moderation {
  selectedFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  selectedTargetType = signal<'ALL' | 'STAND' | 'MENU_ITEM' | 'EVENT'>('ALL');

  setFilter(filter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') {
    this.selectedFilter.set(filter);
  }

  setTargetType(type: 'ALL' | 'STAND' | 'MENU_ITEM' | 'EVENT') {
    this.selectedTargetType.set(type);
  }
}
