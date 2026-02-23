import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/api.service';
import { AdminCafeCreateResponse, AdminConfigEntry, City, MovieSyncResponse } from '../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-page">
      <h1>Admin Panel</h1>
      <p class="subtitle">Operational controls for sync, lobbies, and maintenance.</p>

      <section class="panel">
        <h2>Movie Data Sync</h2>
        <p class="hint">Trigger MovieGlu sync manually for selected city/pincode.</p>
        <div class="grid">
          <div>
            <label>City</label>
            <mat-form-field appearance="outline" class="field">
              <mat-select [value]="selectedCityId" (selectionChange)="selectedCityId = $event.value">
                <mat-option [value]="undefined">None</mat-option>
                <mat-option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div>
            <label>Pincode</label>
            <input class="text-input" [value]="postalCode" (input)="onPostalCodeInput($event)" maxlength="6" />
          </div>
          <div>
            <label>Days</label>
            <input class="text-input" type="number" min="1" max="7" [value]="days" (input)="onDaysInput($event)" />
          </div>
        </div>
        <div class="actions">
          <button mat-flat-button color="primary" (click)="runMovieSync()" [disabled]="syncing">
            {{ syncing ? 'Syncing...' : 'Run Movie Sync' }}
          </button>
        </div>
        <p class="error" *ngIf="syncError">{{ syncError }}</p>
        <p class="success" *ngIf="syncResult">
          Synced {{ syncResult.cityName || 'city' }}:
          venues {{ syncResult.venuesUpserted }}, events {{ syncResult.eventsUpserted }}, showtimes {{ syncResult.showtimesUpserted }}
        </p>
      </section>

      <section class="panel">
        <h2>Add Cafes</h2>
        <p class="hint">Add a cafe venue. A default cafe slot is created automatically so it appears in the app.</p>
        <div class="grid">
          <div>
            <label>City</label>
            <mat-form-field appearance="outline" class="field">
              <mat-select [value]="cafeCityId" (selectionChange)="cafeCityId = $event.value">
                <mat-option [value]="undefined">Select city</mat-option>
                <mat-option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div>
            <label>Cafe Name</label>
            <input class="text-input" [value]="cafeVenueName" (input)="onCafeVenueNameInput($event)" />
          </div>
        </div>
        <div class="actions">
          <button mat-flat-button color="primary" (click)="createCafePlan()" [disabled]="creatingCafe">
            {{ creatingCafe ? 'Adding...' : 'Add Cafe' }}
          </button>
        </div>
        <p class="error" *ngIf="cafeCreateError">{{ cafeCreateError }}</p>
        <p class="success" *ngIf="cafeCreateResult">
          Cafe added: {{ cafeCreateResult.venueName }} (slot #{{ cafeCreateResult.showtimeId }} created)
        </p>
      </section>

      <section class="panel">
        <h2>Maintenance</h2>
        <p class="hint">Quick local maintenance actions.</p>
        <div class="actions">
          <button mat-stroked-button (click)="clearLocalAdminCache()">Clear Admin Cache</button>
        </div>
      </section>

      <section class="panel">
        <h2>Application Config</h2>
        <p class="hint">Owner-managed config. Save writes override values to backend file. Some changes need backend restart.</p>
        <div class="actions">
          <button mat-stroked-button (click)="loadAppConfig()">Refresh Config</button>
        </div>
        <p class="error" *ngIf="configError">{{ configError }}</p>
        <p class="success" *ngIf="configSuccess">{{ configSuccess }}</p>
        <div class="config-list" *ngIf="configEntries.length; else emptyConfig">
          <div class="config-row" *ngFor="let entry of configEntries">
            <div class="config-key">{{ entry.key }}</div>
            <div class="config-editor">
              <input
                class="config-input"
                [value]="configDraftByKey[entry.key]"
                [placeholder]="entry.value === '********' ? '********' : entry.value"
                (input)="onConfigDraftInput(entry.key, $event)"
              />
              <button
                mat-stroked-button
                color="primary"
                (click)="saveConfig(entry)"
                [disabled]="savingConfigKey === entry.key || !canSaveConfig(entry)"
              >
                {{ savingConfigKey === entry.key ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
        <ng-template #emptyConfig>
          <p class="hint">No config properties found.</p>
        </ng-template>
      </section>
    </section>
  `,
  styles: [
    `
      .admin-page {
        max-width: 860px;
        margin: 0 auto;
        padding: 20px 16px 90px;
        display: grid;
        gap: 16px;
      }
      h1 {
        margin: 0;
        font-size: 32px;
      }
      .subtitle {
        margin: 0;
        color: #64748b;
      }
      .panel {
        border: 1px solid rgba(15, 23, 42, 0.1);
        border-radius: 16px;
        padding: 14px;
        background: #fff;
        display: grid;
        gap: 10px;
      }
      h2 {
        margin: 0;
        font-size: 20px;
      }
      .hint {
        margin: 0;
        color: #64748b;
        font-size: 13px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
      }
      label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
      }
      .field {
        width: 100%;
      }
      .text-input {
        width: 100%;
        height: 44px;
        border-radius: 12px;
        border: 1px solid rgba(15, 23, 42, 0.16);
        padding: 0 12px;
        font-size: 14px;
      }
      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .error {
        margin: 0;
        color: #b42318;
        font-weight: 600;
      }
      .success {
        margin: 0;
        color: #0f7b36;
        font-weight: 600;
      }
      .config-list {
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 12px;
        overflow: hidden;
      }
      .config-row {
        display: grid;
        grid-template-columns: minmax(220px, 1.1fr) minmax(320px, 1fr);
        gap: 10px;
        padding: 10px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      }
      .config-row:last-child {
        border-bottom: 0;
      }
      .config-key,
      .config-input {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.35;
        word-break: break-word;
      }
      .config-key {
        color: #0f172a;
        font-weight: 600;
      }
      .config-editor {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .config-input {
        width: 100%;
        height: 38px;
        border-radius: 10px;
        border: 1px solid rgba(15, 23, 42, 0.16);
        padding: 0 10px;
        color: #334155;
      }
      @media (max-width: 760px) {
        .config-row {
          grid-template-columns: 1fr;
        }
        .config-editor {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `
  ]
})
export class AdminComponent implements OnInit {
  cities: City[] = [];
  selectedCityId?: number;
  postalCode = '';
  days = 1;
  syncing = false;
  syncError = '';
  syncResult: MovieSyncResponse | null = null;
  cafeCityId?: number;
  cafeVenueName = '';
  creatingCafe = false;
  cafeCreateError = '';
  cafeCreateResult: AdminCafeCreateResponse | null = null;
  configEntries: AdminConfigEntry[] = [];
  configDraftByKey: Record<string, string> = {};
  configError = '';
  configSuccess = '';
  savingConfigKey: string | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getCities().subscribe((cities) => (this.cities = cities));
    this.loadAppConfig();
  }

  onPostalCodeInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.postalCode = (input?.value ?? '').replace(/\D+/g, '').slice(0, 6);
  }

  onDaysInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const value = Number(input?.value ?? 1);
    if (Number.isFinite(value)) {
      this.days = Math.min(7, Math.max(1, Math.floor(value)));
    }
  }

  onCafeVenueNameInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.cafeVenueName = input?.value ?? '';
    this.cafeCreateError = '';
  }

  runMovieSync() {
    const cityName = this.cities.find((city) => city.id === this.selectedCityId)?.name;
    const pincode = this.postalCode.trim();
    if (!cityName && !pincode) {
      this.syncError = 'Select city or enter pincode.';
      this.syncResult = null;
      return;
    }
    this.syncing = true;
    this.syncError = '';
    this.syncResult = null;
    this.api.syncMovies(pincode || undefined, cityName, this.days).subscribe({
      next: (resp) => {
        this.syncResult = resp;
        this.syncing = false;
      },
      error: (error) => {
        this.syncing = false;
        this.syncError = error?.error?.message || 'Sync failed';
      }
    });
  }

  createCafePlan() {
    if (!this.cafeCityId) {
      this.cafeCreateError = 'Select a city.';
      this.cafeCreateResult = null;
      return;
    }
    if (!this.cafeVenueName.trim()) {
      this.cafeCreateError = 'Enter cafe name.';
      this.cafeCreateResult = null;
      return;
    }
    this.creatingCafe = true;
    this.cafeCreateError = '';
    this.cafeCreateResult = null;
    this.api.createAdminCafePlan({
      cityId: this.cafeCityId,
      venueName: this.cafeVenueName.trim()
    }).subscribe({
      next: (response) => {
        this.creatingCafe = false;
        this.cafeCreateResult = response;
      },
      error: (error) => {
        this.creatingCafe = false;
        this.cafeCreateError = error?.error?.message || 'Failed to create cafe plan';
      }
    });
  }

  clearLocalAdminCache() {
    try {
      localStorage.removeItem('admin_panel_cache');
    } catch {
      // ignore
    }
  }

  loadAppConfig() {
    this.configError = '';
    this.configSuccess = '';
    this.api.getAdminConfig(true).subscribe({
      next: (response) => {
        this.configEntries = response?.entries ?? [];
        this.configDraftByKey = {};
        for (const entry of this.configEntries) {
          this.configDraftByKey[entry.key] = entry.value === '********' ? '' : entry.value;
        }
      },
      error: (error) => {
        this.configEntries = [];
        this.configError = error?.error?.message || 'Failed to load config';
      }
    });
  }

  onConfigDraftInput(key: string, event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.configDraftByKey[key] = input?.value ?? '';
    this.configSuccess = '';
  }

  canSaveConfig(entry: AdminConfigEntry): boolean {
    if (entry.value === '********') {
      return (this.configDraftByKey[entry.key] ?? '').trim().length > 0;
    }
    return (this.configDraftByKey[entry.key] ?? '') !== entry.value;
  }

  saveConfig(entry: AdminConfigEntry) {
    if (!this.canSaveConfig(entry)) {
      return;
    }
    const value = this.configDraftByKey[entry.key] ?? '';
    this.savingConfigKey = entry.key;
    this.configError = '';
    this.configSuccess = '';
    this.api.updateAdminConfig(entry.key, value).subscribe({
      next: (updated) => {
        const index = this.configEntries.findIndex((item) => item.key === entry.key);
        if (index >= 0) {
          this.configEntries[index] = updated;
        }
        this.configDraftByKey[entry.key] = updated.value === '********' ? '' : updated.value;
        this.savingConfigKey = null;
        this.configSuccess = `Saved ${entry.key}`;
      },
      error: (error) => {
        this.savingConfigKey = null;
        this.configError = error?.error?.message || `Failed to save ${entry.key}`;
      }
    });
  }

}
