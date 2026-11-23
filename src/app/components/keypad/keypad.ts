import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Auth } from '../../services/auth';
import {
  AccessibleKeypadStand,
  Food,
  MenuItem,
  StandDetail,
  StandKeypadSlotView,
  StandKeypadState,
  StandOrderView,
  StandStaffRole,
} from '../../services/food';

export type ActiveStationTab = 'CASHIER' | 'KITCHEN' | 'DELIVERY' | 'VIEWER' | 'CONFIG';

@Component({
  selector: 'app-keypad',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './keypad.html',
  styleUrl: './keypad.css',
})
export class Keypad implements OnInit, OnDestroy {
  readonly authService = inject(Auth);
  private readonly foodService = inject(Food);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  accessibleStands: AccessibleKeypadStand[] = [];
  selectedStandId = '';
  standDetail: StandDetail | null = null;
  keypadState: StandKeypadState | null = null;

  activeTab: ActiveStationTab = 'VIEWER';
  isTabletKioskMode = false;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // Postazione CASSA: bozza ordine corrente { slotNumber -> quantity }
  cashierDraft: Record<number, number> = {};

  // Tab CONFIG (OWNER / ADMIN): mappatura 10 slot -> menuItemId
  slotDraftMenuItemIds: Record<number, string> = {};
  newStaffUsername = '';
  newStaffRole: StandStaffRole = 'CASHIER';
  keycloakUsers: { username: string; email: string; displayName: string }[] = [];

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAccessibleStands();
      this.pollTimer = setInterval(() => {
        if (this.selectedStandId && !this.isSubmitting) {
          this.refreshState(true);
        }
      }, 2500);
    }
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private triggerTouchFeedback(ms = 25): void {
    if (isPlatformBrowser(this.platformId) && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignora se non supportato dal browser
      }
    }
  }

  toggleTabletKioskMode(): void {
    this.isTabletKioskMode = !this.isTabletKioskMode;
    this.triggerTouchFeedback(30);
    if (isPlatformBrowser(this.platformId) && typeof document !== 'undefined') {
      if (this.isTabletKioskMode && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!this.isTabletKioskMode && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
    this.cdr.detectChanges();
  }

  private applyKeypadState(state: StandKeypadState): void {
    this.keypadState = state;
    // Aggiorna in tempo reale anche il badge nel selettore cantina in alto
    this.accessibleStands = this.accessibleStands.map((s) =>
      s.standId === state.standId
        ? {
            ...s,
            activeOrdersCount: state.activeOrdersCount,
            currentServingOrderNumber: state.currentDeliveryOrderNumber,
          }
        : s,
    );
    this.cdr.detectChanges();
  }

  loadAccessibleStands(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    this.foodService.listAccessibleKeypadStands().subscribe({
      next: (stands) => {
        this.accessibleStands = stands;
        this.isLoading = false;
        this.cdr.detectChanges();
        if (stands.length > 0) {
          const existing = stands.find((s) => s.standId === this.selectedStandId);
          this.selectStand(existing ? existing.standId : stands[0].standId);
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Impossibile caricare le cantine abilitate per il tuo account.';
        this.cdr.detectChanges();
      },
    });
  }

  selectStand(standId: string): void {
    if (!standId) return;
    this.selectedStandId = standId;
    this.cashierDraft = {};
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.foodService.getStand(standId).subscribe({
      next: (detail) => {
        this.standDetail = detail;
        this.cdr.detectChanges();
      },
    });

    this.refreshState(false, true);
  }

  refreshState(silent = false, autoSelectFirstAllowedTab = false): void {
    if (!this.selectedStandId) return;
    if (!silent) {
      this.isLoading = true;
      this.cdr.detectChanges();
    }

    const stationParam =
      this.activeTab === 'CASHIER' || this.activeTab === 'KITCHEN' || this.activeTab === 'DELIVERY'
        ? this.activeTab
        : undefined;

    this.foodService.getStandKeypadState(this.selectedStandId, stationParam).subscribe({
      next: (state) => {
        this.isLoading = false;
        if (autoSelectFirstAllowedTab) {
          this.syncSlotDraftFromState(state);
          this.pickDefaultTabForPermissions(state.userPermissions);
        }
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isLoading = false;
        if (!silent) {
          this.errorMessage =
            err?.error?.detail || 'Errore nel caricamento dello stato live della pulsantiera.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  private syncSlotDraftFromState(state: StandKeypadState): void {
    this.slotDraftMenuItemIds = {};
    for (const s of state.slots) {
      this.slotDraftMenuItemIds[s.slotNumber] = s.menuItemId || '';
    }
  }

  private pickDefaultTabForPermissions(perms: StandStaffRole[]): void {
    if (perms.includes('OWNER')) {
      this.activeTab = 'CASHIER';
    } else if (perms.includes('CASHIER')) {
      this.activeTab = 'CASHIER';
    } else if (perms.includes('DELIVERY')) {
      this.activeTab = 'DELIVERY';
    } else if (perms.includes('KITCHEN')) {
      this.activeTab = 'KITCHEN';
    } else {
      this.activeTab = 'VIEWER';
    }
  }

  hasPermission(role: StandStaffRole): boolean {
    const perms = this.keypadState?.userPermissions || [];
    return perms.includes('OWNER') || perms.includes(role);
  }

  setTab(tab: ActiveStationTab): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    if (tab === 'CONFIG' && this.keypadState) {
      this.syncSlotDraftFromState(this.keypadState);
      this.searchKeycloakUsers(this.newStaffUsername);
    }
    this.cdr.detectChanges();
  }

  formatFourDigitDisplay(num: number | undefined | null): string {
    const n = Math.max(0, num || 0);
    return n.toString().padStart(4, '0');
  }

  roleLabel(role: StandStaffRole): string {
    switch (role) {
      case 'OWNER':
        return 'Proprietario Cantina';
      case 'CASHIER':
        return 'Postazione Cassa';
      case 'KITCHEN':
        return 'Postazione Cucina';
      case 'DELIVERY':
        return 'Postazione Consegna';
      case 'VIEWER':
        return 'Lettura Ordini';
    }
  }

  // ===========================================================================
  // 1. POSTAZIONE CASSA (ESP32 #1 / Web)
  // ===========================================================================
  onCashierSlotClick(slot: StandKeypadSlotView): void {
    if (!slot.menuItemId) return;
    const currentQty = this.cashierDraft[slot.slotNumber] || 0;
    if (currentQty >= slot.availablePlates) {
      this.errorMessage = `Porzioni esaurite per "${slot.menuItemName}" (Slot ${slot.slotNumber}).`;
      this.cdr.detectChanges();
      return;
    }
    this.triggerTouchFeedback(20);
    this.errorMessage = '';
    this.cashierDraft = {
      ...this.cashierDraft,
      [slot.slotNumber]: currentQty + 1,
    };
    this.cdr.detectChanges();
  }

  decrementCashierDraft(slotNumber: number): void {
    const current = this.cashierDraft[slotNumber] || 0;
    const nextDraft = { ...this.cashierDraft };
    if (current <= 1) {
      delete nextDraft[slotNumber];
    } else {
      nextDraft[slotNumber] = current - 1;
    }
    this.cashierDraft = nextDraft;
    this.cdr.detectChanges();
  }

  clearCashierDraft(): void {
    this.cashierDraft = {};
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  cashierDraftTotalItems(): number {
    return Object.values(this.cashierDraft).reduce((acc, q) => acc + q, 0);
  }

  cashierDraftSummaryList(): { slotNumber: number; name: string; kind: string; quantity: number }[] {
    if (!this.keypadState) return [];
    const list: { slotNumber: number; name: string; kind: string; quantity: number }[] = [];
    for (const slot of this.keypadState.slots) {
      const qty = this.cashierDraft[slot.slotNumber] || 0;
      if (qty > 0 && slot.menuItemName) {
        list.push({
          slotNumber: slot.slotNumber,
          name: slot.menuItemName,
          kind: slot.kind || 'FOOD',
          quantity: qty,
        });
      }
    }
    return list;
  }

  confirmCashierOrder(): void {
    if (!this.selectedStandId) return;
    const items = Object.entries(this.cashierDraft)
      .map(([slotStr, qty]) => ({ slotNumber: Number(slotStr), quantity: qty }))
      .filter((it) => it.quantity > 0);

    if (items.length === 0) {
      this.errorMessage = 'Seleziona almeno un piatto o vino dai 10 pulsanti prima di confermare.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.foodService.createStandKeypadOrder(this.selectedStandId, items).subscribe({
      next: (state) => {
        this.isSubmitting = false;
        this.cashierDraft = {};
        this.successMessage = `Ordine #${this.formatFourDigitDisplay(state.lastIssuedOrderNumber)} confermato e inviato a Cucina e Consegna!`;
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.detail || 'Errore durante la conferma dell’ordine in cassa.';
        this.cdr.detectChanges();
      },
    });
  }

  // ===========================================================================
  // 2. POSTAZIONE CUCINA (ESP32 #2 / Web)
  // ===========================================================================
  onKitchenSlotPress(slot: StandKeypadSlotView): void {
    if (!this.selectedStandId || slot.pendingToCookCount <= 0 || this.isSubmitting) return;
    this.triggerTouchFeedback(35);
    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService.pressKitchenKeypadSlot(this.selectedStandId, slot.slotNumber, 1).subscribe({
      next: (state) => {
        this.isSubmitting = false;
        this.successMessage = `Cucina: 1x "${slot.menuItemName}" (Slot ${slot.slotNumber}) segnato come pronto!`;
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.detail || 'Errore durante la pressione del pulsante cucina.';
        this.cdr.detectChanges();
      },
    });
  }

  // ===========================================================================
  // 3. POSTAZIONE CONSEGNA / BANCONE (ESP32 #3 / Web)
  // ===========================================================================
  currentDeliveryOrder(): StandOrderView | null {
    if (!this.keypadState || this.keypadState.activeOrders.length === 0) {
      return null;
    }
    return this.keypadState.activeOrders[0];
  }

  onDeliverySlotPress(slot: StandKeypadSlotView): void {
    if (!this.selectedStandId || slot.deliveryLedState === 'OFF' || this.isSubmitting) return;
    this.triggerTouchFeedback(35);
    const prevOrderNum = this.keypadState?.currentDeliveryOrderNumber || 0;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService.pressDeliveryKeypadSlot(this.selectedStandId, slot.slotNumber, 1).subscribe({
      next: (state) => {
        this.isSubmitting = false;
        if (state.lastDeliveredOrderNumber === prevOrderNum && prevOrderNum > 0) {
          this.successMessage = `Ordine #${this.formatFourDigitDisplay(prevOrderNum)} completato e consegnato! Passaggio automatico a Ordine #${this.formatFourDigitDisplay(state.currentDeliveryOrderNumber)}.`;
        } else {
          this.successMessage = `Consegna: 1x "${slot.menuItemName}" servito per Ordine #${this.formatFourDigitDisplay(prevOrderNum)}.`;
        }
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.detail || 'Errore durante la pressione del pulsante consegna.';
        this.cdr.detectChanges();
      },
    });
  }

  // ===========================================================================
  // 5. CONFIGURAZIONE 10 SLOT, TOKEN ESP32 & PERMESSI OPERATORI (OWNER / ADMIN)
  // ===========================================================================
  standMenuItems(): MenuItem[] {
    return this.standDetail?.menuItems || [];
  }

  saveSlotsConfiguration(regenerateToken = false): void {
    if (!this.selectedStandId) return;
    const slots = Array.from({ length: 10 }, (_, idx) => {
      const slotNumber = idx + 1;
      const menuItemId = this.slotDraftMenuItemIds[slotNumber] || null;
      return { slotNumber, menuItemId };
    });

    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService
      .updateStandKeypadSlots(this.selectedStandId, slots, regenerateToken)
      .subscribe({
        next: (state) => {
          this.isSubmitting = false;
          this.syncSlotDraftFromState(state);
          this.successMessage = regenerateToken
            ? 'Nuovo Device Token ESP32 generato e 10 slot salvati!'
            : 'Configurazione dei 10 slot pulsantiera salvata con successo!';
          this.applyKeypadState(state);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage =
            err?.error?.detail || 'Errore nel salvataggio della configurazione dei 10 slot.';
          this.cdr.detectChanges();
        },
      });
  }

  grantStaffPermission(): void {
    if (!this.selectedStandId || !this.newStaffUsername.trim()) {
      this.errorMessage = 'Inserisci lo username dell’operatore (es. maria-chiara, scricci, lisa-la).';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService
      .addStandStaffPermission(this.selectedStandId, this.newStaffUsername, this.newStaffRole)
      .subscribe({
        next: (state) => {
          this.isSubmitting = false;
          this.successMessage = `Permesso ${this.roleLabel(this.newStaffRole)} assegnato a "${this.newStaffUsername.trim()}"!`;
          this.newStaffUsername = '';
          this.applyKeypadState(state);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err?.error?.detail || 'Errore durante l’assegnazione del permesso.';
          this.cdr.detectChanges();
        },
      });
  }

  revokeStaffPermission(permissionId: string, username: string, role: StandStaffRole): void {
    if (!this.selectedStandId) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService.deleteStandStaffPermission(this.selectedStandId, permissionId).subscribe({
      next: (state) => {
        this.isSubmitting = false;
        this.successMessage = `Permesso ${this.roleLabel(role)} revocato per "${username}".`;
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.detail || 'Errore durante la revoca del permesso.';
        this.cdr.detectChanges();
      },
    });
  }

  resetOrderCounter(): void {
    if (!this.selectedStandId) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService.resetStandKeypadCounter(this.selectedStandId).subscribe({
      next: (state) => {
        this.isSubmitting = false;
        this.cashierDraft = {};
        this.successMessage = 'Coda azzerata e contatore ordini riportato a #0001 per il nuovo turno!';
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.detail || 'Errore durante il reset del contatore ordini.';
        this.cdr.detectChanges();
      },
    });
  }

  searchKeycloakUsers(query = ''): void {
    this.foodService.lookupUsers(query, 25).subscribe({
      next: (users) => {
        this.keycloakUsers = users;
        this.cdr.detectChanges();
      },
      error: () => {
        this.keycloakUsers = [];
        this.cdr.detectChanges();
      },
    });
  }

  selectSuggestedUser(username: string): void {
    this.newStaffUsername = username;
    this.cdr.detectChanges();
  }

  cancelSingleOrder(order: StandOrderView): void {
    if (!this.selectedStandId) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService.cancelStandKeypadOrder(this.selectedStandId, order.id).subscribe({
      next: (state) => {
        this.isSubmitting = false;
        this.successMessage = `Ordine #${this.formatFourDigitDisplay(order.orderNumber)} annullato e porzioni ripristinate a menu!`;
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.detail || 'Errore durante l’annullamento del singolo ordine.';
        this.cdr.detectChanges();
      },
    });
  }

  completeSingleOrder(order: StandOrderView): void {
    if (!this.selectedStandId) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.foodService.completeStandKeypadOrder(this.selectedStandId, order.id).subscribe({
      next: (state) => {
        this.isSubmitting = false;
        this.successMessage = `Ordine #${this.formatFourDigitDisplay(order.orderNumber)} segnato come completato e consegnato!`;
        this.applyKeypadState(state);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.detail || 'Errore durante il completamento rapido dell’ordine.';
        this.cdr.detectChanges();
      },
    });
  }
}
