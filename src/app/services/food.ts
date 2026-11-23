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
export type ReviewTargetType = 'STAND' | 'MENU_ITEM' | 'EVENT';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type StandStaffRole = 'OWNER' | 'CASHIER' | 'KITCHEN' | 'DELIVERY' | 'VIEWER';
export type KeypadStationRole = 'CASHIER' | 'KITCHEN' | 'DELIVERY';
export type DeliveryLedState = 'OFF' | 'BLINKING' | 'SOLID';
export type StandOrderStatus = 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface AccessibleKeypadStand {
  standId: string;
  standNumber: number;
  standName: string;
  permissions: StandStaffRole[];
  activeOrdersCount: number;
  currentServingOrderNumber: number;
}

export interface StandKeypadSlotView {
  slotNumber: number;
  menuItemId?: string | null;
  menuItemName?: string | null;
  kind?: MenuKind | null;
  availablePlates: number;
  pendingToCookCount: number;
  currentDeliveryOrderRequiredCount: number;
  currentDeliveryOrderCookedCount: number;
  currentDeliveryOrderDeliveredCount: number;
  kitchenLedOn: boolean;
  deliveryLedState: DeliveryLedState;
}

export interface StandOrderItemView {
  id: string;
  slotNumber: number;
  menuItemId?: string | null;
  menuItemName: string;
  kind: MenuKind;
  orderedQuantity: number;
  cookedQuantity: number;
  deliveredQuantity: number;
}

export interface StandOrderView {
  id: string;
  standId: string;
  orderNumber: number;
  status: StandOrderStatus;
  createdBy?: string | null;
  createdAt: string;
  readyAt?: string | null;
  deliveredAt?: string | null;
  items: StandOrderItemView[];
}

export interface StandStaffPermissionView {
  id: string;
  standId: string;
  username: string;
  permission: StandStaffRole;
  grantedBy?: string | null;
  createdAt: string;
}

export interface StandKeypadState {
  standId: string;
  standNumber: number;
  standName: string;
  deviceToken?: string | null;
  nextOrderNumber: number;
  lastIssuedOrderNumber: number;
  oldestKitchenOrderNumber: number;
  currentDeliveryOrderNumber: number;
  lastDeliveredOrderNumber: number;
  activeOrdersCount: number;
  totalPendingKitchenPortions: number;
  lastCashierSeenAt?: string | null;
  lastKitchenSeenAt?: string | null;
  lastDeliverySeenAt?: string | null;
  userPermissions: StandStaffRole[];
  slots: StandKeypadSlotView[];
  activeOrders: StandOrderView[];
  recentDeliveredOrders: StandOrderView[];
  staffPermissions: StandStaffPermissionView[];
}

export interface FestivalReview {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  standId?: string;
  targetName?: string;
  authorUsername: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  moderatedBy?: string;
  moderationNote?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

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
  activeOrdersCount?: number;
  currentServingOrderNumber?: number;
  estimatedWaitMinutes?: number;
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

  getPublicConfig(): Observable<{ googleMapsApiKey?: string }> {
    return this.http.get<{ googleMapsApiKey?: string }>('/api/config/public');
  }

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
    return this.http.put<MenuItem>(`${this.STANDS_URL}/${standId}/menu-items/${itemId}`, item);
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

  listReviews(options?: {
    targetType?: ReviewTargetType;
    targetId?: string;
    standId?: string;
    status?: ReviewStatus;
  }): Observable<FestivalReview[]> {
    let params = new HttpParams();
    if (options?.targetType) params = params.set('targetType', options.targetType);
    if (options?.targetId) params = params.set('targetId', options.targetId);
    if (options?.standId) params = params.set('standId', options.standId);
    if (options?.status) params = params.set('status', options.status);
    return this.http.get<FestivalReview[]>(`${this.STANDS_URL}/reviews`, { params });
  }

  moderateReview(
    reviewId: string,
    status: 'APPROVED' | 'REJECTED',
    moderationNote?: string,
  ): Observable<FestivalReview> {
    return this.http.put<FestivalReview>(`${this.STANDS_URL}/reviews/${reviewId}/moderation`, {
      status,
      moderationNote: moderationNote?.trim() || undefined,
    });
  }

  // ===========================================================================
  // PULSANTIERA IoT 10 SLOT, 3 POSTAZIONI (CASSA/CUCINA/CONSEGNA) & PERMESSI
  // ===========================================================================
  listAccessibleKeypadStands(): Observable<AccessibleKeypadStand[]> {
    return this.http.get<AccessibleKeypadStand[]>(`${this.STANDS_URL}/keypad/accessible`);
  }

  getStandKeypadState(standId: string, station?: KeypadStationRole): Observable<StandKeypadState> {
    let params = new HttpParams();
    if (station) {
      params = params.set('station', station);
    }
    return this.http.get<StandKeypadState>(`${this.STANDS_URL}/${standId}/keypad/state`, { params });
  }

  updateStandKeypadSlots(
    standId: string,
    slots: { slotNumber: number; menuItemId?: string | null }[],
    regenerateDeviceToken = false,
  ): Observable<StandKeypadState> {
    return this.http.put<StandKeypadState>(`${this.STANDS_URL}/${standId}/keypad/slots`, {
      slots,
      regenerateDeviceToken,
    });
  }

  addStandStaffPermission(
    standId: string,
    username: string,
    permission: StandStaffRole,
  ): Observable<StandKeypadState> {
    return this.http.post<StandKeypadState>(`${this.STANDS_URL}/${standId}/keypad/permissions`, {
      username: username.trim(),
      permission,
    });
  }

  deleteStandStaffPermission(standId: string, permissionId: string): Observable<StandKeypadState> {
    return this.http.delete<StandKeypadState>(
      `${this.STANDS_URL}/${standId}/keypad/permissions/${permissionId}`,
    );
  }

  createStandKeypadOrder(
    standId: string,
    items: { slotNumber: number; quantity: number }[],
  ): Observable<StandKeypadState> {
    return this.http.post<StandKeypadState>(`${this.STANDS_URL}/${standId}/keypad/orders`, {
      items,
    });
  }

  pressKitchenKeypadSlot(
    standId: string,
    slotNumber: number,
    quantity = 1,
  ): Observable<StandKeypadState> {
    return this.http.post<StandKeypadState>(`${this.STANDS_URL}/${standId}/keypad/kitchen/press`, {
      slotNumber,
      quantity,
    });
  }

  pressDeliveryKeypadSlot(
    standId: string,
    slotNumber: number,
    quantity = 1,
  ): Observable<StandKeypadState> {
    return this.http.post<StandKeypadState>(`${this.STANDS_URL}/${standId}/keypad/delivery/press`, {
      slotNumber,
      quantity,
    });
  }

  resetStandKeypadCounter(standId: string): Observable<StandKeypadState> {
    return this.http.post<StandKeypadState>(
      `${this.STANDS_URL}/${standId}/keypad/orders/reset-counter`,
      {},
    );
  }

  cancelStandKeypadOrder(standId: string, orderId: string): Observable<StandKeypadState> {
    return this.http.post<StandKeypadState>(
      `${this.STANDS_URL}/${standId}/keypad/orders/${orderId}/cancel`,
      {},
    );
  }

  completeStandKeypadOrder(standId: string, orderId: string): Observable<StandKeypadState> {
    return this.http.post<StandKeypadState>(
      `${this.STANDS_URL}/${standId}/keypad/orders/${orderId}/complete`,
      {},
    );
  }

  lookupUsers(search = '', limit = 25): Observable<{ username: string; email: string; displayName: string }[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<{ username: string; email: string; displayName: string }[]>(
      `${environment.authUrl}/users/lookup`,
      { params },
    );
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
