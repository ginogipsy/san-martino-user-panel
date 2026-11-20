import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import {
  FestivalReview,
  Food,
  ReviewStatus,
  ReviewTargetType,
} from '../../services/food';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './moderation.html',
  styleUrl: './moderation.css',
})
export class Moderation implements OnInit {
  private readonly foodService = inject(Food);

  selectedFilter = signal<'ALL' | ReviewStatus>('PENDING');
  selectedTargetType = signal<'ALL' | ReviewTargetType>('ALL');
  reviews = signal<FestivalReview[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  moderatingId = signal<string | null>(null);
  noteDrafts: Record<string, string> = {};

  ngOnInit(): void {
    this.loadReviews();
  }

  setFilter(filter: 'ALL' | ReviewStatus): void {
    this.selectedFilter.set(filter);
    this.loadReviews();
  }

  setTargetType(type: 'ALL' | ReviewTargetType): void {
    this.selectedTargetType.set(type);
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const status = this.selectedFilter();
    const targetType = this.selectedTargetType();

    this.foodService
      .listReviews({
        status: status === 'ALL' ? undefined : status,
        targetType: targetType === 'ALL' ? undefined : targetType,
      })
      .subscribe({
        next: (items) => {
          this.reviews.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Impossibile caricare le recensioni dal server.');
          this.loading.set(false);
        },
      });
  }

  moderate(review: FestivalReview, decision: 'APPROVED' | 'REJECTED'): void {
    this.moderatingId.set(review.id);
    const note = this.noteDrafts[review.id];

    this.foodService.moderateReview(review.id, decision, note).subscribe({
      next: () => {
        this.moderatingId.set(null);
        delete this.noteDrafts[review.id];
        this.loadReviews();
      },
      error: () => {
        this.moderatingId.set(null);
        this.errorMessage.set('Errore durante il salvataggio della moderazione.');
      },
    });
  }

  starsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, idx) => (idx < rating ? 1 : 0));
  }

  targetTypeLabel(type: ReviewTargetType): string {
    switch (type) {
      case 'STAND':
        return 'Cantina';
      case 'MENU_ITEM':
        return 'Piatto';
      case 'EVENT':
        return 'Evento';
    }
  }

  statusLabel(status: ReviewStatus): string {
    switch (status) {
      case 'PENDING':
        return 'In attesa';
      case 'APPROVED':
        return 'Approvata';
      case 'REJECTED':
        return 'Rifiutata';
    }
  }
}
