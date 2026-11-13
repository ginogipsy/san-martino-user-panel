import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Food,
  MenuItem,
  MenuItemCreate,
  MenuKind,
  Owner,
  OwnerCreate,
  StandCreate,
  StandDetail,
  StandSummary,
} from '../../services/food';
import { Auth } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-admin-stand',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Navbar],
  templateUrl: './admin-stand.html',
  styleUrl: './admin-stand.css',
})
export class AdminStand implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private foodService = inject(Food);
  public authService = inject(Auth);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('standMapContainer') standMapContainer?: ElementRef<HTMLDivElement>;

  stands = signal<StandSummary[]>([]);
  selectedStand = signal<StandDetail | null>(null);
  isCreatingStand = signal(false);
  editingMenuItemId = signal<string | null>(null);

  loading = signal(false);
  savingStand = signal(false);
  savingMenuItem = signal(false);
  savingOwner = signal(false);
  feedbackMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  mapSearchQuery = signal('');
  searchingAddress = signal(false);

  private leafletLib: any = null;
  private mapInstance: any = null;
  private mapMarker: any = null;

  /**
   * Un utente può modificare la cantina se:
   * - ha ruolo ROLE_ADMIN, oppure
   * - sta creando una nuova cantina (solo Admin), oppure
   * - ha ruolo ROLE_STAND_OWNER ed è associato alla cantina selezionata
   *   tramite claim JWT `standId` oppure tramite la lista `owners` (username o email).
   */
  canEditSelectedStand = computed(() => {
    if (this.authService.isAdmin()) {
      return true;
    }
    if (this.isCreatingStand()) {
      return this.authService.isAdmin();
    }
    const stand = this.selectedStand();
    if (!stand) {
      return false;
    }
    if (!this.authService.isStandOwner()) {
      return false;
    }
    const tokenStandId = this.authService.getStandId();
    if (tokenStandId && tokenStandId === stand.id) {
      return true;
    }
    const username = (this.authService.getUsername() || '').trim().toLowerCase();
    const email = (this.authService.getUserEmail() || '').trim().toLowerCase();
    const owners = stand.owners || [];
    return owners.some((o) => {
      const ownerFirst = (o.firstName || '').trim().toLowerCase();
      const ownerLast = (o.lastName || '').trim().toLowerCase();
      const ownerFull = `${ownerFirst} ${ownerLast}`.trim();
      const ownerEmail = (o.email || '').trim().toLowerCase();
      return (
        (username &&
          (ownerFirst === username ||
            ownerLast === username ||
            ownerFull === username ||
            (ownerEmail && ownerEmail.split('@')[0] === username))) ||
        (email && ownerEmail === email)
      );
    });
  });

  standForm: FormGroup = this.fb.group({
    number: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    descriptionIt: ['', Validators.required],
    descriptionEn: ['', Validators.required],
    firstParticipationYear: [
      2020,
      [Validators.required, Validators.min(1900), Validators.max(2200)],
    ],
    latitude: [41.5822, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [13.5775, [Validators.required, Validators.min(-180), Validators.max(180)]],
  });

  menuItemForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    kind: ['FOOD' as MenuKind, Validators.required],
    availablePlates: [50, [Validators.required, Validators.min(0)]],
    descriptionIt: ['', Validators.required],
    descriptionEn: ['', Validators.required],
    keywordsText: [''],
  });

  ownerForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: [''],
    phone: [''],
    role: ['SECONDARY', Validators.required],
  });

  ngOnInit() {
    this.loadStands();
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  loadStands(selectStandId?: string) {
    this.loading.set(true);
    this.foodService.listStands().subscribe({
      next: (list) => {
        const sorted = [...list].sort((a, b) => a.number - b.number);
        this.stands.set(sorted);
        this.loading.set(false);

        const targetId =
          selectStandId ||
          this.authService.getStandId() ||
          this.selectedStand()?.id ||
          (sorted.length > 0 ? sorted[0].id : undefined);

        if (targetId) {
          this.selectStand(targetId);
        }
      },
      error: () => {
        this.loading.set(false);
        this.showFeedback('error', 'Impossibile caricare la lista delle cantine.');
      },
    });
  }

  selectStand(standId: string) {
    this.isCreatingStand.set(false);
    this.editingMenuItemId.set(null);
    this.foodService.getStand(standId).subscribe({
      next: (detail) => {
        this.selectedStand.set(detail);
        this.standForm.patchValue({
          number: detail.number,
          name: detail.name,
          descriptionIt: detail.description?.it || '',
          descriptionEn: detail.description?.en || '',
          firstParticipationYear: detail.firstParticipationYear,
          latitude: detail.latitude,
          longitude: detail.longitude,
        });
        this.syncFormEditState();
        this.resetMenuItemForm();
        setTimeout(() => this.initOrUpdateMap(detail.latitude, detail.longitude), 60);
      },
      error: () => {
        this.showFeedback('error', 'Errore nel caricamento del dettaglio cantina.');
      },
    });
  }

  startNewStand() {
    if (!this.authService.isAdmin()) {
      this.showFeedback('error', 'Solo un amministratore può creare una nuova cantina.');
      return;
    }
    this.selectedStand.set(null);
    this.isCreatingStand.set(true);
    this.editingMenuItemId.set(null);
    const nextNumber =
      this.stands().length > 0 ? Math.max(...this.stands().map((s) => s.number)) + 1 : 1;
    this.standForm.reset({
      number: nextNumber,
      name: '',
      descriptionIt: '',
      descriptionEn: '',
      firstParticipationYear: new Date().getFullYear(),
      latitude: 41.5822,
      longitude: 13.5775,
    });
    this.syncFormEditState();
    setTimeout(() => this.initOrUpdateMap(41.5822, 13.5775), 60);
  }

  private syncFormEditState() {
    if (this.canEditSelectedStand()) {
      this.standForm.enable({ emitEvent: false });
    } else {
      this.standForm.disable({ emitEvent: false });
    }
    this.updateMarkerInteractivity();
  }

  private async initOrUpdateMap(lat: number, lng: number) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const container = this.standMapContainer?.nativeElement;
    if (!container) {
      return;
    }

    if (!this.leafletLib) {
      const mod = await import('leaflet');
      this.leafletLib = (mod as any).default || mod;
    }
    const L = this.leafletLib;

    const validLat = Number.isFinite(lat) ? lat : 41.5822;
    const validLng = Number.isFinite(lng) ? lng : 13.5775;

    if (!this.mapInstance) {
      this.mapInstance = L.map(container, {
        center: [validLat, validLng],
        zoom: 17,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.mapInstance);

      const customIcon = L.divIcon({
        className: 'stand-map-pin',
        html: '<div style="font-size:28px;line-height:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));">🍷</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 24],
      });

      this.mapMarker = L.marker([validLat, validLng], {
        draggable: this.canEditSelectedStand(),
        icon: customIcon,
      }).addTo(this.mapInstance);

      this.mapMarker.on('dragend', () => {
        if (!this.canEditSelectedStand()) return;
        const pos = this.mapMarker.getLatLng();
        this.applyCoordinatesFromMap(pos.lat, pos.lng);
      });

      this.mapInstance.on('click', (e: any) => {
        if (!this.canEditSelectedStand()) return;
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        this.mapMarker.setLatLng([clickedLat, clickedLng]);
        this.applyCoordinatesFromMap(clickedLat, clickedLng);
      });
    } else {
      this.mapInstance.setView([validLat, validLng], 17);
      if (this.mapMarker) {
        this.mapMarker.setLatLng([validLat, validLng]);
      }
      this.mapInstance.invalidateSize();
    }

    this.updateMarkerInteractivity();
  }

  private updateMarkerInteractivity() {
    if (!this.mapMarker?.dragging) return;
    if (this.canEditSelectedStand()) {
      this.mapMarker.dragging.enable();
    } else {
      this.mapMarker.dragging.disable();
    }
  }

  private applyCoordinatesFromMap(lat: number, lng: number) {
    const roundedLat = Number(lat.toFixed(6));
    const roundedLng = Number(lng.toFixed(6));
    this.standForm.patchValue({
      latitude: roundedLat,
      longitude: roundedLng,
    });
  }

  searchAddressOnMap() {
    const query = this.mapSearchQuery().trim();
    if (!query || !isPlatformBrowser(this.platformId)) return;

    this.searchingAddress.set(true);
    const fullQuery = query.toLowerCase().includes('arce') ? query : `${query}, Arce, Italia`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullQuery)}`;

    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((results: any[]) => {
        this.searchingAddress.set(false);
        if (Array.isArray(results) && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            if (this.canEditSelectedStand()) {
              this.applyCoordinatesFromMap(lat, lng);
            }
            this.initOrUpdateMap(lat, lng);
          }
        } else {
          this.showFeedback('error', 'Indirizzo non trovato sulla mappa.');
        }
      })
      .catch(() => {
        this.searchingAddress.set(false);
        this.showFeedback('error', 'Errore durante la ricerca indirizzo sulla mappa.');
      });
  }

  getGoogleMapsUrl(): string {
    const raw = this.standForm.getRawValue();
    const lat = raw.latitude ?? 41.5822;
    const lng = raw.longitude ?? 13.5775;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  private destroyMap() {
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
      this.mapMarker = null;
    }
  }

  saveStand() {
    if (!this.canEditSelectedStand()) {
      this.showFeedback('error', 'Non hai i permessi per modificare questa cantina.');
      return;
    }
    if (this.standForm.invalid) return;

    const raw = this.standForm.getRawValue();
    const payload: StandCreate = {
      number: Number(raw.number),
      name: raw.name,
      description: {
        it: raw.descriptionIt,
        en: raw.descriptionEn,
      },
      firstParticipationYear: Number(raw.firstParticipationYear),
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
    };

    this.savingStand.set(true);
    const current = this.selectedStand();

    if (this.isCreatingStand() || !current) {
      this.foodService.createStand(payload).subscribe({
        next: (created) => {
          this.savingStand.set(false);
          this.isCreatingStand.set(false);
          this.showFeedback('success', `Cantina "${created.name}" creata con successo.`);
          this.loadStands(created.id);
        },
        error: () => {
          this.savingStand.set(false);
          this.showFeedback('error', 'Errore durante la creazione della cantina.');
        },
      });
    } else {
      this.foodService.updateStand(current.id, payload).subscribe({
        next: (updated) => {
          this.savingStand.set(false);
          this.selectedStand.set(updated);
          this.showFeedback('success', `Cantina "${updated.name}" aggiornata con successo.`);
          this.loadStands(updated.id);
        },
        error: () => {
          this.savingStand.set(false);
          this.showFeedback('error', "Errore durante l'aggiornamento della cantina.");
        },
      });
    }
  }

  deleteCurrentStand() {
    const current = this.selectedStand();
    if (!current || !this.authService.isAdmin()) return;
    if (!confirm(`Sei sicuro di voler eliminare la cantina #${current.number} "${current.name}"?`)) {
      return;
    }

    this.foodService.deleteStand(current.id).subscribe({
      next: () => {
        this.showFeedback('success', 'Cantina eliminata.');
        this.selectedStand.set(null);
        this.loadStands();
      },
      error: () => {
        this.showFeedback('error', "Errore durante l'eliminazione della cantina.");
      },
    });
  }

  // --- Gestione Proprietari / Gestori Cantina (Solo Admin) ---

  addOwnerToStand() {
    const current = this.selectedStand();
    if (!current || !this.authService.isAdmin() || this.ownerForm.invalid) return;

    const raw = this.ownerForm.getRawValue();
    const payload: OwnerCreate = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email ? raw.email.trim() : undefined,
      phone: raw.phone ? raw.phone.trim() : undefined,
      role: raw.role,
    };

    this.savingOwner.set(true);
    this.foodService.addOwner(current.id, payload).subscribe({
      next: () => {
        this.savingOwner.set(false);
        this.ownerForm.reset({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'SECONDARY',
        });
        this.showFeedback('success', 'Gestore associato alla cantina.');
        this.selectStand(current.id);
      },
      error: () => {
        this.savingOwner.set(false);
        this.showFeedback('error', "Errore nell'associazione del gestore.");
      },
    });
  }

  removeOwnerFromStand(owner: Owner) {
    const current = this.selectedStand();
    if (!current || !this.authService.isAdmin()) return;

    this.foodService.deleteOwner(current.id, owner.id).subscribe({
      next: () => {
        this.showFeedback('success', 'Gestore rimosso dalla cantina.');
        this.selectStand(current.id);
      },
      error: () => {
        this.showFeedback('error', 'Errore nella rimozione del gestore.');
      },
    });
  }

  // --- Gestione Piatti, Parole Chiave e Quantità ---

  startEditMenuItem(item: MenuItem) {
    if (!this.canEditSelectedStand()) return;
    this.editingMenuItemId.set(item.id);
    this.menuItemForm.patchValue({
      name: item.name,
      kind: item.kind,
      availablePlates: item.availablePlates,
      descriptionIt: item.description?.it || '',
      descriptionEn: item.description?.en || '',
      keywordsText: (item.keywords || []).join(', '),
    });
  }

  resetMenuItemForm() {
    this.editingMenuItemId.set(null);
    this.menuItemForm.reset({
      name: '',
      kind: 'FOOD',
      availablePlates: 50,
      descriptionIt: '',
      descriptionEn: '',
      keywordsText: '',
    });
  }

  saveMenuItem() {
    const current = this.selectedStand();
    if (!current || !this.canEditSelectedStand() || this.menuItemForm.invalid) return;

    const raw = this.menuItemForm.getRawValue();
    const keywords = this.parseKeywords(raw.keywordsText);

    const payload: MenuItemCreate = {
      name: raw.name,
      kind: raw.kind,
      availablePlates: Math.max(0, Number(raw.availablePlates)),
      description: {
        it: raw.descriptionIt,
        en: raw.descriptionEn,
      },
      keywords,
    };

    this.savingMenuItem.set(true);
    const editId = this.editingMenuItemId();

    if (editId) {
      this.foodService.updateMenuItem(current.id, editId, payload).subscribe({
        next: () => {
          this.savingMenuItem.set(false);
          this.showFeedback('success', `Piatto "${payload.name}" aggiornato.`);
          this.resetMenuItemForm();
          this.selectStand(current.id);
        },
        error: () => {
          this.savingMenuItem.set(false);
          this.showFeedback('error', "Errore durante l'aggiornamento del piatto.");
        },
      });
    } else {
      this.foodService.addMenuItem(current.id, payload).subscribe({
        next: () => {
          this.savingMenuItem.set(false);
          this.showFeedback('success', `Piatto "${payload.name}" aggiunto al menu.`);
          this.resetMenuItemForm();
          this.selectStand(current.id);
        },
        error: () => {
          this.savingMenuItem.set(false);
          this.showFeedback('error', "Errore durante l'inserimento del piatto.");
        },
      });
    }
  }

  adjustMenuItemQuantity(item: MenuItem, delta: number) {
    if (!this.canEditSelectedStand()) return;
    const nextQty = Math.max(0, (item.availablePlates || 0) + delta);
    this.setMenuItemQuantity(item, nextQty);
  }

  setMenuItemQuantity(item: MenuItem, quantity: number) {
    const current = this.selectedStand();
    if (!current || !this.canEditSelectedStand()) return;

    const safeQty = Math.max(0, Math.floor(Number(quantity) || 0));
    const payload: MenuItemCreate = {
      name: item.name,
      kind: item.kind,
      availablePlates: safeQty,
      description: item.description,
      keywords: item.keywords || [],
    };

    this.foodService.updateMenuItem(current.id, item.id, payload).subscribe({
      next: (updatedItem) => {
        const updatedMenu = current.menuItems.map((m) =>
          m.id === updatedItem.id ? updatedItem : m,
        );
        this.selectedStand.set({ ...current, menuItems: updatedMenu });
      },
      error: () => {
        this.showFeedback('error', 'Errore nel salvataggio della quantità disponibile.');
      },
    });
  }

  deleteMenuItem(item: MenuItem) {
    const current = this.selectedStand();
    if (!current || !this.canEditSelectedStand()) return;
    if (!confirm(`Vuoi rimuovere "${item.name}" dal menu della cantina?`)) return;

    this.foodService.deleteMenuItem(current.id, item.id).subscribe({
      next: () => {
        this.showFeedback('success', `Piatto "${item.name}" rimosso.`);
        this.selectStand(current.id);
      },
      error: () => {
        this.showFeedback('error', 'Errore durante la rimozione del piatto.');
      },
    });
  }

  parseKeywords(raw: string): string[] {
    if (!raw) return [];
    return raw
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
  }

  private showFeedback(type: 'success' | 'error', text: string) {
    this.feedbackMessage.set({ type, text });
    setTimeout(() => {
      if (this.feedbackMessage()?.text === text) {
        this.feedbackMessage.set(null);
      }
    }, 4000);
  }
}
