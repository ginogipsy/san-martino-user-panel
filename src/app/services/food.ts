import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, switchMap, forkJoin, of } from 'rxjs';

export interface LocalizedText {
  it: string;
  en: string;
}

export type MenuKind = 'FOOD' | 'DRINK';
export type OwnerRole = 'PRIMARY' | 'SECONDARY';

export interface Owner {
  id: string;
  standId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: OwnerRole;
}

export interface OwnerCreate {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: OwnerRole;
}

export interface MenuItem {
  id: string;
  standId: string;
  name: string;
  description: LocalizedText;
  availablePlates: number;
  kind: MenuKind;
  keywords: string[];
}

export interface StandSummary {
  id: string;
  number: number;
  name: string;
  description: LocalizedText;
  firstParticipationYear: number;
  latitude: number;
  longitude: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StandDetail extends StandSummary {
  owners: Owner[];
  menuItems: MenuItem[];
}

export interface StandCreate {
  number: number;
  name: string;
  description: LocalizedText;
  firstParticipationYear: number;
  latitude: number;
  longitude: number;
}

export type StandUpdate = StandCreate;

export interface MenuItemCreate {
  name: string;
  description: LocalizedText;
  availablePlates: number;
  kind: MenuKind;
  keywords?: string[];
}

export type MenuItemUpdate = MenuItemCreate;

@Injectable({
  providedIn: 'root',
})
export class Food {
  private readonly http = inject(HttpClient);
  private readonly STANDS_URL = environment.standsUrl;

  listStands(): Observable<StandSummary[]> {
    return this.http.get<StandSummary[]>(this.STANDS_URL);
  }

  getStand(standId: string): Observable<StandDetail> {
    return this.http.get<StandDetail>(`${this.STANDS_URL}/${standId}`);
  }

  createStand(stand: StandCreate): Observable<StandDetail> {
    return this.http.post<StandDetail>(this.STANDS_URL, stand);
  }

  updateStand(standId: string, stand: StandUpdate): Observable<StandDetail> {
    return this.http.put<StandDetail>(`${this.STANDS_URL}/${standId}`, stand);
  }

  deleteStand(standId: string): Observable<void> {
    return this.http.delete<void>(`${this.STANDS_URL}/${standId}`);
  }

  listMenuItems(standId: string, kind?: MenuKind): Observable<MenuItem[]> {
    let params = new HttpParams();
    if (kind) {
      params = params.set('kind', kind);
    }
    return this.http.get<MenuItem[]>(`${this.STANDS_URL}/${standId}/menu-items`, { params });
  }

  addMenuItem(standId: string, item: MenuItemCreate): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.STANDS_URL}/${standId}/menu-items`, item);
  }

  updateMenuItem(standId: string, itemId: string, item: MenuItemUpdate): Observable<MenuItem> {
    return this.http.put<MenuItem>(
      `${this.STANDS_URL}/${standId}/menu-items/${itemId}`,
      item,
    );
  }

  deleteMenuItem(standId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.STANDS_URL}/${standId}/menu-items/${itemId}`);
  }

  listOwners(standId: string): Observable<Owner[]> {
    return this.http.get<Owner[]>(`${this.STANDS_URL}/${standId}/owners`);
  }

  addOwner(standId: string, owner: OwnerCreate): Observable<Owner> {
    return this.http.post<Owner>(`${this.STANDS_URL}/${standId}/owners`, owner);
  }

  deleteOwner(standId: string, ownerId: string): Observable<void> {
    return this.http.delete<void>(`${this.STANDS_URL}/${standId}/owners/${ownerId}`);
  }

  /**
   * Crea un nuovo stand e poi aggiunge tutti i piatti al menu.
   */
  addStandWithMenu(stand: StandCreate, menu: MenuItemCreate[]): Observable<StandDetail> {
    return this.createStand(stand).pipe(
      switchMap((newStand) => {
        if (!menu || menu.length === 0) return of(newStand);

        const menuRequests = menu.map((item) => this.addMenuItem(newStand.id, item));

        return forkJoin(menuRequests).pipe(switchMap(() => this.getStand(newStand.id)));
      }),
    );
  }

  // Compatibilità con il metodo precedente
  updateStandMenu(standId: string, item: MenuItemCreate): Observable<MenuItem> {
    return this.addMenuItem(standId, item);
  }
}
