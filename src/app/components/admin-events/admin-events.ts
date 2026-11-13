import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EventsService,
  FestivalEvent,
  EventCreate,
  SagaInstance,
} from '../../services/events';
import { Food, StandSummary } from '../../services/food';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar],
  templateUrl: './admin-events.html',
  styleUrl: './admin-events.css',
})
export class AdminEvents implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eventsService = inject(EventsService);
  private readonly foodService = inject(Food);

  events: FestivalEvent[] = [];
  stands: StandSummary[] = [];
  sagas: SagaInstance[] = [];

  editingEventId: string | null = null;
  selectedStandIds = new Set<string>();
  activeTab: 'events' | 'saga' = 'events';

  statusMessage = '';
  errorMessage = '';
  isSubmitting = false;

  eventForm = this.fb.group({
    name: ['Le cantine di San Martino 2026', [Validators.required, Validators.maxLength(200)]],
    place: ['Arce (FR) — centro storico', [Validators.required, Validators.maxLength(200)]],
    startDate: ['2026-11-14', Validators.required],
    endDate: ['2026-11-15', Validators.required],
    descriptionIt: ['', Validators.required],
    descriptionEn: ['', Validators.required],
  });

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loadEvents();
    this.loadStands();
    this.loadSagas();
  }

  loadEvents() {
    this.eventsService.listEvents().subscribe({
      next: (data) => (this.events = data),
      error: () => (this.errorMessage = 'Impossibile caricare la lista degli eventi dal Gateway.'),
    });
  }

  loadStands() {
    this.foodService.listStands().subscribe({
      next: (data) => (this.stands = data),
      error: () => {},
    });
  }

  loadSagas() {
    this.eventsService.listSagas().subscribe({
      next: (data) => (this.sagas = data),
      error: () => {},
    });
  }

  switchTab(tab: 'events' | 'saga') {
    this.activeTab = tab;
    this.statusMessage = '';
    this.errorMessage = '';
    if (tab === 'saga') {
      this.editingEventId = null;
    }
  }

  selectEventForEdit(event: FestivalEvent) {
    this.activeTab = 'events';
    this.editingEventId = event.id;
    this.statusMessage = '';
    this.errorMessage = '';
    this.eventForm.patchValue({
      name: event.name,
      place: event.place,
      startDate: event.startDate,
      endDate: event.endDate,
      descriptionIt: event.description.it,
      descriptionEn: event.description.en,
    });
  }

  resetForm() {
    this.editingEventId = null;
    this.selectedStandIds.clear();
    this.eventForm.reset({
      name: '',
      place: 'Arce (FR) — centro storico',
      startDate: '',
      endDate: '',
      descriptionIt: '',
      descriptionEn: '',
    });
  }

  toggleStandSelection(standId: string) {
    if (this.selectedStandIds.has(standId)) {
      this.selectedStandIds.delete(standId);
    } else {
      this.selectedStandIds.add(standId);
    }
  }

  selectAllStands() {
    this.stands.forEach((s) => this.selectedStandIds.add(s.id));
  }

  clearStandSelection() {
    this.selectedStandIds.clear();
  }

  private buildEventPayload(): EventCreate {
    const raw = this.eventForm.value;
    return {
      name: raw.name!,
      place: raw.place!,
      startDate: raw.startDate!,
      endDate: raw.endDate!,
      description: {
        it: raw.descriptionIt!,
        en: raw.descriptionEn!,
      },
    };
  }

  onSubmitEvent() {
    if (this.eventForm.invalid) return;

    this.isSubmitting = true;
    this.statusMessage = '';
    this.errorMessage = '';
    const payload = this.buildEventPayload();

    if (this.editingEventId) {
      this.eventsService.updateEvent(this.editingEventId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.statusMessage = 'Edizione aggiornata con successo!';
          this.resetForm();
          this.loadEvents();
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = "Errore durante l'aggiornamento dell'evento.";
        },
      });
    } else {
      this.eventsService.createEvent(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.statusMessage = 'Nuova edizione creata con successo!';
          this.resetForm();
          this.loadEvents();
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = "Errore durante la creazione dell'evento.";
        },
      });
    }
  }

  onDeleteEvent(event: FestivalEvent) {
    this.statusMessage = '';
    this.errorMessage = '';
    this.eventsService.deleteEvent(event.id).subscribe({
      next: () => {
        this.statusMessage = `Edizione "${event.name}" eliminata.`;
        if (this.editingEventId === event.id) {
          this.resetForm();
        }
        this.loadEvents();
      },
      error: () => {
        this.errorMessage = "Errore durante l'eliminazione dell'evento.";
      },
    });
  }

  onSubmitSaga() {
    if (this.eventForm.invalid || this.selectedStandIds.size === 0) {
      this.errorMessage = 'Compila tutti i campi e seleziona almeno una cantina partecipante.';
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = '';
    this.errorMessage = '';

    const request = {
      event: this.buildEventPayload(),
      standIds: Array.from(this.selectedStandIds),
    };

    this.eventsService.startCreateEventWithStands(request).subscribe({
      next: (saga) => {
        this.isSubmitting = false;
        this.statusMessage = `Saga completata (${saga.status})! Evento creato con ${saga.participations.length} cantine associate.`;
        this.resetForm();
        this.loadEvents();
        this.loadSagas();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || 'Errore o compensazione durante la Saga.';
        this.errorMessage = `Saga non completata: ${msg}`;
        this.loadSagas();
      },
    });
  }
}
