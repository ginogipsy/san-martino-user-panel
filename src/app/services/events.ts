import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LocalizedText } from './food';

export type EventStatus = 'UPCOMING' | 'PAST';

export interface FestivalEvent {
  id: string;
  name: string;
  place: string;
  startDate: string;
  endDate: string;
  description: LocalizedText;
  status: EventStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventCreate {
  name: string;
  place: string;
  startDate: string;
  endDate: string;
  description: LocalizedText;
}

export type EventUpdate = EventCreate;

export type SagaStatus = 'STARTED' | 'COMPLETED' | 'FAILED' | 'COMPENSATING' | 'COMPENSATED';
export type SagaStepStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'COMPENSATED';

export interface SagaStep {
  name: string;
  stepOrder: number;
  status: SagaStepStatus;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
}

export interface Participation {
  eventId: string;
  standId: string;
}

export interface SagaInstance {
  id: string;
  type: string;
  status: SagaStatus;
  createdEventId?: string;
  startedAt?: string;
  finishedAt?: string;
  steps: SagaStep[];
  participations: Participation[];
  message?: string;
}

export interface CreateEventWithStandsRequest {
  event: EventCreate;
  standIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly EVENTS_URL = environment.eventsUrl;
  private readonly SAGAS_URL = environment.sagasUrl;

  listEvents(status?: EventStatus): Observable<FestivalEvent[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<FestivalEvent[]>(this.EVENTS_URL, { params });
  }

  getEvent(id: string): Observable<FestivalEvent> {
    return this.http.get<FestivalEvent>(`${this.EVENTS_URL}/${id}`);
  }

  createEvent(payload: EventCreate): Observable<FestivalEvent> {
    return this.http.post<FestivalEvent>(this.EVENTS_URL, payload);
  }

  updateEvent(id: string, payload: EventUpdate): Observable<FestivalEvent> {
    return this.http.put<FestivalEvent>(`${this.EVENTS_URL}/${id}`, payload);
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.EVENTS_URL}/${id}`);
  }

  listSagas(): Observable<SagaInstance[]> {
    return this.http.get<SagaInstance[]>(this.SAGAS_URL);
  }

  getSaga(id: string): Observable<SagaInstance> {
    return this.http.get<SagaInstance>(`${this.SAGAS_URL}/${id}`);
  }

  startCreateEventWithStands(request: CreateEventWithStandsRequest): Observable<SagaInstance> {
    return this.http.post<SagaInstance>(
      `${this.SAGAS_URL}/create-event-with-stands`,
      request,
    );
  }
}
