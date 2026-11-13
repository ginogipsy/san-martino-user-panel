import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import {
  Food,
  StandCreate,
  StandSummary,
  StandDetail,
  MenuItem,
  MenuItemCreate,
  MenuKind,
} from '../../services/food';
import { Auth } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-admin-stand',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar],
  templateUrl: './admin-stand.html',
  styleUrl: './admin-stand.css',
})
export class AdminStand implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly foodService = inject(Food);
  readonly authService = inject(Auth);

  isStandOwner = false;
  userStandId: string | null = null;

  stands: StandSummary[] = [];
  selectedStand: StandDetail | null = null;
  editingMenuItemId: string | null = null;

  statusMessage = '';
  errorMessage = '';
  isSubmitting = false;

  // Form principale cantina + creazione rapida piatti in blocco
  standForm = this.fb.group({
    standId: [''],
    number: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    descriptionIt: ['', Validators.required],
    descriptionEn: ['', Validators.required],
    firstParticipationYear: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(1900), Validators.max(2200)],
    ],
    latitude: [41.5822, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [13.5775, [Validators.required, Validators.min(-180), Validators.max(180)]],
    menu: this.fb.array([]),
  });

  // Form dedicato per aggiungere o modificare un singolo piatto/bevanda su una cantina esistente
  dishForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    descriptionIt: ['', Validators.required],
    descriptionEn: ['', Validators.required],
    availablePlates: [50, [Validators.required, Validators.min(0)]],
    kind: ['FOOD' as MenuKind, Validators.required],
    keywordsCsv: [''],
  });

  ngOnInit() {
    const role = this.authService.getUserRole();
    this.isStandOwner = role === 'ROLE_STAND_OWNER' && !this.authService.isAdmin();
    this.userStandId = this.authService.getStandId();

    this.loadStands();
  }

  get menu(): FormArray {
    return this.standForm.controls['menu'] as FormArray;
  }

  loadStands() {
    this.foodService.listStands().subscribe({
      next: (list) => {
        this.stands = list.sort((a, b) => a.number - b.number);
        if (this.isStandOwner && this.userStandId) {
          this.selectStand(this.userStandId);
        } else if (this.selectedStand) {
          this.selectStand(this.selectedStand.id);
        }
      },
      error: () => {
        // In test o offline non blocchiamo il form di creazione
      },
    });
  }

  selectStand(standId: string) {
    this.statusMessage = '';
    this.errorMessage = '';
    this.editingMenuItemId = null;

    this.foodService.getStand(standId).subscribe({
      next: (detail) => {
        this.selectedStand = detail;
        this.standForm.patchValue({
          standId: detail.id,
          number: detail.number,
          name: detail.name,
          descriptionIt: detail.description.it,
          descriptionEn: detail.description.en,
          firstParticipationYear: detail.firstParticipationYear,
          latitude: detail.latitude,
          longitude: detail.longitude,
        });
        this.menu.clear();
        this.resetDishForm();
      },
      error: () => {
        this.errorMessage = 'Impossibile caricare il dettaglio della cantina selezionata.';
      },
    });
  }

  prepareNewStand() {
    this.selectedStand = null;
    this.editingMenuItemId = null;
    this.statusMessage = '';
    this.errorMessage = '';
    this.standForm.reset({
      standId: '',
      number: (this.stands.at(-1)?.number || 0) + 1,
      name: '',
      descriptionIt: '',
      descriptionEn: '',
      firstParticipationYear: new Date().getFullYear(),
      latitude: 41.5822,
      longitude: 13.5775,
    });
    this.menu.clear();
  }

  addPiatto() {
    const piattoForm = this.fb.group({
      nomePiatto: ['', Validators.required],
      descrizioneIt: ['', Validators.required],
      descrizioneEn: ['', Validators.required],
      prezzo: [5, [Validators.min(0)]],
      disponibilita: [100, [Validators.required, Validators.min(0)]],
      tipo: ['FOOD' as MenuKind, Validators.required],
      keywordsCsv: [''],
    });
    this.menu.push(piattoForm);
  }

  removePiatto(index: number) {
    this.menu.removeAt(index);
  }

  parseKeywords(csv: string | null | undefined): string[] {
    if (!csv) return [];
    return Array.from(
      new Set(
        csv
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  onSubmit() {
    if (this.standForm.invalid) return;

    const rawData = this.standForm.value;
    const standData: StandCreate = {
      number: Number(rawData.number),
      name: rawData.name!,
      description: {
        it: rawData.descriptionIt!,
        en: rawData.descriptionEn!,
      },
      firstParticipationYear: Number(rawData.firstParticipationYear),
      latitude: Number(rawData.latitude),
      longitude: Number(rawData.longitude),
    };

    const menuData: MenuItemCreate[] = (rawData.menu || []).map((m: any) => ({
      name: m.nomePiatto,
      description: {
        it: m.descrizioneIt,
        en: m.descrizioneEn,
      },
      availablePlates: Number(m.disponibilita),
      kind: (m.tipo || 'FOOD') as MenuKind,
      keywords: this.parseKeywords(m.keywordsCsv),
    }));

    this.isSubmitting = true;
    this.statusMessage = '';
    this.errorMessage = '';

    // Se una cantina è già selezionata, aggiorniamo i suoi dati base
    if (this.selectedStand) {
      this.foodService.updateStand(this.selectedStand.id, standData).subscribe({
        next: (updated) => {
          this.isSubmitting = false;
          this.selectedStand = updated;
          this.statusMessage = `Cantina #${updated.number} "${updated.name}" aggiornata con successo!`;
          this.loadStands();
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = "Errore durante l'aggiornamento della cantina.";
        },
      });
      return;
    }

    // Altrimenti creiamo una nuova cantina con gli eventuali piatti iniziali
    this.foodService.addStandWithMenu(standData, menuData).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.statusMessage = `Cantina "${created.name}" creata con successo!`;
        this.loadStands();
        if (created?.id) {
          this.selectStand(created.id);
        } else {
          this.prepareNewStand();
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Errore durante il salvataggio della cantina. Controlla il Gateway.';
      },
    });
  }

  onDeleteStand(stand: StandSummary) {
    this.statusMessage = '';
    this.errorMessage = '';
    this.foodService.deleteStand(stand.id).subscribe({
      next: () => {
        this.statusMessage = `Cantina #${stand.number} "${stand.name}" eliminata.`;
        if (this.selectedStand?.id === stand.id) {
          this.prepareNewStand();
        }
        this.loadStands();
      },
      error: () => {
        this.errorMessage = "Errore durante l'eliminazione della cantina.";
      },
    });
  }

  // --- Gestione singoli Piatti e Quantità sulla cantina selezionata ---

  editMenuItem(item: MenuItem) {
    this.editingMenuItemId = item.id;
    this.dishForm.patchValue({
      name: item.name,
      descriptionIt: item.description.it,
      descriptionEn: item.description.en,
      availablePlates: item.availablePlates,
      kind: item.kind,
      keywordsCsv: (item.keywords || []).join(', '),
    });
  }

  resetDishForm() {
    this.editingMenuItemId = null;
    this.dishForm.reset({
      name: '',
      descriptionIt: '',
      descriptionEn: '',
      availablePlates: 50,
      kind: 'FOOD',
      keywordsCsv: '',
    });
  }

  onSaveDish() {
    if (!this.selectedStand || this.dishForm.invalid) return;

    const raw = this.dishForm.value;
    const payload: MenuItemCreate = {
      name: raw.name!,
      description: {
        it: raw.descriptionIt!,
        en: raw.descriptionEn!,
      },
      availablePlates: Number(raw.availablePlates),
      kind: (raw.kind || 'FOOD') as MenuKind,
      keywords: this.parseKeywords(raw.keywordsCsv),
    };

    const standId = this.selectedStand.id;
    this.statusMessage = '';
    this.errorMessage = '';

    if (this.editingMenuItemId) {
      this.foodService.updateMenuItem(standId, this.editingMenuItemId, payload).subscribe({
        next: () => {
          this.statusMessage = `Piatto "${payload.name}" aggiornato!`;
          this.resetDishForm();
          this.selectStand(standId);
        },
        error: () => {
          this.errorMessage = "Errore durante l'aggiornamento del piatto.";
        },
      });
    } else {
      this.foodService.addMenuItem(standId, payload).subscribe({
        next: () => {
          this.statusMessage = `Piatto "${payload.name}" aggiunto al menu!`;
          this.resetDishForm();
          this.selectStand(standId);
        },
        error: () => {
          this.errorMessage = "Errore durante l'inserimento del piatto.";
        },
      });
    }
  }

  adjustPlateQuantity(item: MenuItem, delta: number) {
    if (!this.selectedStand) return;
    const nextQty = Math.max(0, item.availablePlates + delta);
    this.setPlateQuantity(item, nextQty);
  }

  setPlateQuantity(item: MenuItem, newQuantity: number) {
    if (!this.selectedStand) return;
    const safeQty = Math.max(0, Math.floor(Number(newQuantity) || 0));

    const payload: MenuItemCreate = {
      name: item.name,
      description: item.description,
      availablePlates: safeQty,
      kind: item.kind,
      keywords: item.keywords || [],
    };

    this.foodService.updateMenuItem(this.selectedStand.id, item.id, payload).subscribe({
      next: (updated) => {
        item.availablePlates = updated.availablePlates;
        this.statusMessage = `Quantità "${item.name}" aggiornata a ${updated.availablePlates} porzioni.`;
      },
      error: () => {
        this.errorMessage = `Impossibile aggiornare la quantità di "${item.name}".`;
      },
    });
  }

  onDeleteDish(item: MenuItem) {
    if (!this.selectedStand) return;
    const standId = this.selectedStand.id;
    this.foodService.deleteMenuItem(standId, item.id).subscribe({
      next: () => {
        this.statusMessage = `Piatto "${item.name}" rimosso dal menu.`;
        if (this.editingMenuItemId === item.id) {
          this.resetDishForm();
        }
        this.selectStand(standId);
      },
      error: () => {
        this.errorMessage = 'Errore durante la rimozione del piatto.';
      },
    });
  }
}
