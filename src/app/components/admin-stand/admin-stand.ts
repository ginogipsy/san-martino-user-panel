import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { Food, StandCreate, MenuItemCreate } from '../../services/food';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-admin-stand',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-stand.html',
  styleUrl: './admin-stand.css',
})
export class AdminStand implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly foodService = inject(Food);
  private readonly authService = inject(Auth);

  isStandOwner = false;
  userStandId: string | null = null;

  // Form allineato con lo schema OpenAPI di san-martino-services
  standForm = this.fb.group({
    standId: [''], // Per i gestori
    number: [0, [Validators.required, Validators.min(1)]],
    name: ['', Validators.required],
    descriptionIt: ['', Validators.required],
    descriptionEn: ['', Validators.required],
    firstParticipationYear: [new Date().getFullYear(), Validators.required],
    latitude: [41.59, Validators.required],
    longitude: [13.57, Validators.required],
    menu: this.fb.array([]),
  });

  ngOnInit() {
    const role = this.authService.getUserRole();
    this.isStandOwner = role === 'ROLE_STAND_OWNER';
    this.userStandId = this.authService.getStandId();

    if (this.isStandOwner && this.userStandId) {
      this.standForm.patchValue({ standId: this.userStandId });
      // In un caso reale caricheremmo i dati dello stand esistente qui
    }
  }

  get menu() {
    return this.standForm.controls['menu'] as FormArray;
  }

  addPiatto() {
    const piattoForm = this.fb.group({
      nomePiatto: ['', Validators.required],
      descrizioneIt: ['', Validators.required],
      descrizioneEn: ['', Validators.required],
      prezzo: [0, [Validators.required, Validators.min(0.5)]],
      disponibilita: [100, [Validators.required, Validators.min(0)]],
      tipo: ['FOOD', Validators.required],
    });
    this.menu.push(piattoForm);
  }

  removePiatto(index: number) {
    this.menu.removeAt(index);
  }

  onSubmit() {
    if (this.standForm.valid) {
      const rawData = this.standForm.value;

      // Mapping verso StandCreate (OpenAPI)
      const standData: StandCreate = {
        number: rawData.number!,
        name: rawData.name!,
        description: {
          it: rawData.descriptionIt!,
          en: rawData.descriptionEn!,
        },
        firstParticipationYear: rawData.firstParticipationYear!,
        latitude: rawData.latitude!,
        longitude: rawData.longitude!,
      };

      // Mapping verso MenuItemCreate[]
      const menuData: MenuItemCreate[] = (rawData.menu || []).map((m: any) => ({
        name: m.nomePiatto,
        description: {
          it: m.descrizioneIt,
          en: m.descrizioneEn,
        },
        availablePlates: m.disponibilita,
        kind: m.tipo as 'FOOD' | 'DRINK',
      }));

      if (this.isStandOwner && this.userStandId) {
        // Se è già un gestore, aggiungiamo solo i nuovi piatti al suo stand
        // In produzione useremmo un endpoint di update massivo o singoli add
        alert('Gestione piatti per stand ' + this.userStandId);
        // Esempio: loop su menuData chiamando updateStandMenu
      } else {
        // Se è Admin, crea tutto il pacchetto
        this.foodService.addStandWithMenu(standData, menuData).subscribe({
          next: (res) => {
            alert('Stand e Menu creati con successo tramite Gateway!');
            this.standForm.reset();
            this.menu.clear();
          },
          error: (err) => alert('Errore durante il salvataggio. Controlla il Gateway.'),
        });
      }
    }
  }
}
