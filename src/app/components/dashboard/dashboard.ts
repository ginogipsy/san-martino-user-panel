import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Navbar } from '../navbar/navbar';
import { Food, StandSummary } from '../../services/food';
import { EventsService, FestivalEvent } from '../../services/events';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  readonly authService = inject(Auth);
  private readonly foodService = inject(Food);
  private readonly eventsService = inject(EventsService);

  eventsCount = 0;
  standsCount = 0;
  upcomingEventName = '';

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.loadSummaryCounters();
    }
  }

  private loadSummaryCounters() {
    this.foodService.listStands().subscribe({
      next: (stands: StandSummary[]) => {
        this.standsCount = stands.length;
      },
      error: () => {
        this.standsCount = 0;
      },
    });

    if (this.authService.canManageEvents()) {
      this.eventsService.listEvents().subscribe({
        next: (events: FestivalEvent[]) => {
          this.eventsCount = events.length;
          const upcoming = events.find((e) => e.status === 'UPCOMING');
          this.upcomingEventName = upcoming ? upcoming.name : '';
        },
        error: () => {
          this.eventsCount = 0;
        },
      });
    }
  }
}
