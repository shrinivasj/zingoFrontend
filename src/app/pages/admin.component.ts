import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { timeout } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AdminCafeCreateResponse, AdminConfigEntry, AdminDashboardResponse, City, CsvImportResponse, MovieSyncResponse } from '../core/models';

type AdminSection = 'dashboard' | 'movie-sync' | 'cafe' | 'trek' | 'maintenance' | 'config';
type ActivityTone = 'movie' | 'cafe' | 'trek' | 'config' | 'maintenance';

interface PlanDraft {
  cityId?: number;
  venueName: string;
  title: string;
  address: string;
  postalCode: string;
  startsAt: string;
}

interface ActivityItem {
  title: string;
  subtitle: string;
  meta: string;
  tone: ActivityTone;
}

interface SyncHistoryItem {
  title: string;
  subtitle: string;
  meta: string;
  status: 'Success' | 'No Data';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-title">Aurofly</div>
          <div class="brand-subtitle">Control Room</div>
        </div>

        <nav class="sidebar-nav">
          <button class="nav-item" [class.active]="activeSection === 'dashboard'" (click)="setSection('dashboard')">
            <span class="nav-icon nav-icon--dashboard">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="iconPath('dashboard', 1)"></path>
                <path [attr.d]="iconPath('dashboard', 2)"></path>
              </svg>
            </span>
            <span>Dashboard</span>
          </button>
          <button class="nav-item" [class.active]="activeSection === 'movie-sync'" (click)="setSection('movie-sync')">
            <span class="nav-icon nav-icon--movie">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="iconPath('movie', 1)"></path>
                <path [attr.d]="iconPath('movie', 2)"></path>
              </svg>
            </span>
            <span>Movie Sync</span>
          </button>
          <button class="nav-item" [class.active]="activeSection === 'cafe'" (click)="setSection('cafe')">
            <span class="nav-icon nav-icon--cafe">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="iconPath('cafe', 1)"></path>
                <path [attr.d]="iconPath('cafe', 2)"></path>
              </svg>
            </span>
            <span>Cafe Plans</span>
          </button>
          <button class="nav-item" [class.active]="activeSection === 'trek'" (click)="setSection('trek')">
            <span class="nav-icon nav-icon--trek">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="iconPath('trek', 1)"></path>
                <path [attr.d]="iconPath('trek', 2)"></path>
              </svg>
            </span>
            <span>Trek Plans</span>
          </button>
          <button class="nav-item" [class.active]="activeSection === 'maintenance'" (click)="setSection('maintenance')">
            <span class="nav-icon nav-icon--maintenance">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="iconPath('maintenance', 1)"></path>
              </svg>
            </span>
            <span>Maintenance</span>
          </button>
          <button class="nav-item" [class.active]="activeSection === 'config'" (click)="setSection('config')">
            <span class="nav-icon nav-icon--config">
              <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="iconPath('config', 1)"></path>
                <path [attr.d]="iconPath('config', 2)"></path>
              </svg>
            </span>
            <span>Config</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div>Version 1.0</div>
          <div>Admin Access</div>
        </div>
      </aside>

      <main class="content">
        <header class="page-header">
          <h1>{{ sectionTitle() }}</h1>
          <p>{{ sectionSubtitle() }}</p>
        </header>

        <ng-container [ngSwitch]="activeSection">
          <section *ngSwitchCase="'dashboard'" class="page-body dashboard-body">
            <div class="stats-grid">
              <article class="stat-card">
                <span class="card-icon card-icon--city">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="iconPath('city', 1)"></path>
                    <path [attr.d]="iconPath('city', 2)"></path>
                  </svg>
                </span>
                <div class="stat-value">{{ dashboardStats.cityCount }}</div>
                <div class="stat-label">Cities Loaded</div>
              </article>
              <article class="stat-card">
                <span class="card-icon card-icon--cafe">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="iconPath('cafe', 1)"></path>
                    <path [attr.d]="iconPath('cafe', 2)"></path>
                  </svg>
                </span>
                <div class="stat-value">{{ dashboardStats.cafePlanCount }}</div>
                <div class="stat-label">Cafe Plans</div>
              </article>
              <article class="stat-card">
                <span class="card-icon card-icon--trek">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="iconPath('trek', 1)"></path>
                    <path [attr.d]="iconPath('trek', 2)"></path>
                  </svg>
                </span>
                <div class="stat-value">{{ dashboardStats.trekPlanCount }}</div>
                <div class="stat-label">Trek Plans</div>
              </article>
              <article class="stat-card">
                <span class="card-icon card-icon--config">
                  <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="iconPath('config', 1)"></path>
                    <path [attr.d]="iconPath('config', 2)"></path>
                  </svg>
                </span>
                <div class="stat-value">{{ dashboardStats.movieShowtimeCount }}</div>
                <div class="stat-label">Movie Showtimes</div>
              </article>
            </div>

            <section class="content-block">
              <h2>Quick Actions</h2>
              <div class="quick-grid">
                <button class="quick-card" (click)="setSection('movie-sync')">
                  <span class="card-icon card-icon--movie"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('movie', 1)"></path><path [attr.d]="iconPath('movie', 2)"></path></svg></span>
                  <strong>Run Movie Sync</strong>
                  <span>Refresh cinema listings for cities</span>
                </button>
                <button class="quick-card" (click)="setSection('cafe')">
                  <span class="card-icon card-icon--cafe"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('cafe', 1)"></path><path [attr.d]="iconPath('cafe', 2)"></path></svg></span>
                  <strong>Create Cafe Plan</strong>
                  <span>Curate a new cafe gathering</span>
                </button>
                <button class="quick-card" (click)="setSection('trek')">
                  <span class="card-icon card-icon--trek"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('trek', 1)"></path><path [attr.d]="iconPath('trek', 2)"></path></svg></span>
                  <strong>Create Trek Plan</strong>
                  <span>Organize an outdoor adventure</span>
                </button>
                <button class="quick-card" (click)="setSection('maintenance')">
                  <span class="card-icon card-icon--maintenance"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('maintenance', 1)"></path></svg></span>
                  <strong>Maintenance</strong>
                  <span>System utilities and operations</span>
                </button>
                <button class="quick-card" (click)="setSection('config')">
                  <span class="card-icon card-icon--config"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('config', 1)"></path><path [attr.d]="iconPath('config', 2)"></path></svg></span>
                  <strong>App Config</strong>
                  <span>Manage application settings</span>
                </button>
              </div>
            </section>

            <section class="content-block">
              <h2>Recent Activity</h2>
              <div class="activity-list card-surface" *ngIf="recentActivity.length; else noActivity">
                <article class="activity-row" *ngFor="let item of recentActivity">
                  <span class="card-icon tone-icon" [ngClass]="iconToneClass(item.tone)">
                    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <path [attr.d]="iconPath(item.tone, 1)"></path>
                      <path *ngIf="iconPath(item.tone, 2)" [attr.d]="iconPath(item.tone, 2)"></path>
                    </svg>
                  </span>
                  <div class="activity-copy">
                    <strong>{{ item.title }}</strong>
                    <div>{{ item.subtitle }}</div>
                  </div>
                  <div class="activity-meta">{{ item.meta }}</div>
                </article>
              </div>
              <ng-template #noActivity>
                <div class="empty-state card-surface">No admin activity yet.</div>
              </ng-template>
            </section>
          </section>

          <section *ngSwitchCase="'movie-sync'" class="page-body">
            <article class="studio-card">
              <div class="studio-head">
                <div class="studio-title-wrap">
                  <span class="card-icon card-icon--movie"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('movie', 1)"></path><path [attr.d]="iconPath('movie', 2)"></path></svg></span>
                  <div>
                    <h2>Movie Data Sync</h2>
                    <p>Refresh cinema listings by location</p>
                  </div>
                </div>
                <span class="pill pill--movie">Sync</span>
              </div>
              <div class="form-grid form-grid--two">
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
                  <input class="text-input" [value]="postalCode" (input)="onPostalCodeInput($event)" maxlength="6" placeholder="e.g., 400001" />
                </div>
              </div>
              <div>
                <label>Days to fetch</label>
                <input class="text-input" type="number" min="1" max="7" [value]="days" (input)="onDaysInput($event)" />
                <p class="field-help">Recommended: 1-7 days</p>
              </div>
              <button class="primary-cta movie" (click)="runMovieSync()" [disabled]="syncing || uploadingCsv">{{ syncing ? 'Running Sync...' : 'Run Sync' }}</button>
              <div class="csv-import-box">
                <div>
                  <label>Upload Movies CSV</label>
                  <input class="csv-input" type="file" accept=".csv,text/csv" (change)="onCsvSelected($event)" />
                  <p class="field-help">Expected headers: movie, theater, date, showtime, language, format, availability, prices, source</p>
                  <p class="field-help" *ngIf="selectedCsvName">Selected: {{ selectedCsvName }}</p>
                </div>
                <button class="secondary-cta compact" type="button" (click)="uploadMoviesCsv()" [disabled]="!selectedCsvFile || uploadingCsv || syncing">{{ uploadingCsv ? 'Uploading...' : 'Import CSV' }}</button>
              </div>
              <p class="success" *ngIf="csvImportResult">Imported {{ csvImportResult.rowsProcessed }} rows, skipped {{ csvImportResult.rowsSkipped }} for {{ csvImportResult.cityName }}.</p>
              <p class="error" *ngIf="syncError">{{ syncError }}</p>
            </article>
            <section class="content-block">
              <h2>Recent Syncs</h2>
              <div class="list-card" *ngIf="movieSyncHistory.length; else noSyncs">
                <article class="list-row" *ngFor="let sync of movieSyncHistory">
                  <div>
                    <strong>{{ sync.title }}</strong>
                    <div>{{ sync.subtitle }}</div>
                    <div>{{ sync.meta }}</div>
                  </div>
                  <span class="status-chip" [class.success]="sync.status === 'Success'" [class.warning]="sync.status === 'No Data'">{{ sync.status }}</span>
                </article>
              </div>
              <ng-template #noSyncs><div class="empty-state card-surface">No sync runs recorded yet.</div></ng-template>
            </section>
          </section>

          <section *ngSwitchCase="'cafe'" class="page-body">
            <article class="studio-card">
              <div class="studio-head">
                <div class="studio-title-wrap">
                  <span class="card-icon card-icon--cafe"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('cafe', 1)"></path><path [attr.d]="iconPath('cafe', 2)"></path></svg></span>
                  <div>
                    <h2>Cafe Plan Studio</h2>
                    <p>{{ cafeEditingShowtimeId ? 'Edit an existing cafe plan' : 'Curate a new cafe gathering' }}</p>
                  </div>
                </div>
                <span class="pill pill--cafe">Cafe</span>
              </div>
              <div class="form-grid form-grid--two">
                <div>
                  <label>City</label>
                  <mat-form-field appearance="outline" class="field">
                    <mat-select [value]="cafeDraft.cityId" (selectionChange)="cafeDraft.cityId = $event.value">
                      <mat-option [value]="undefined">Select city</mat-option>
                      <mat-option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                <div>
                  <label>Postal Code</label>
                  <input class="text-input" [value]="cafeDraft.postalCode" (input)="onPlanInput('cafe', 'postalCode', $event, 10)" placeholder="e.g., 400001" />
                </div>
              </div>
              <div>
                <label>Cafe Name</label>
                <input class="text-input" [value]="cafeDraft.venueName" (input)="onPlanInput('cafe', 'venueName', $event)" placeholder="e.g., Blue Tokai Coffee" />
              </div>
              <div>
                <label>Plan Title</label>
                <input class="text-input" [value]="cafeDraft.title" (input)="onPlanInput('cafe', 'title', $event)" placeholder="e.g., Sunday Morning Coffee & Books" />
              </div>
              <div>
                <label>Address</label>
                <input class="text-input" [value]="cafeDraft.address" (input)="onPlanInput('cafe', 'address', $event, 200)" placeholder="e.g., 123 MG Road, Bandra West" />
              </div>
              <div>
                <label>Start Date & Time (Optional)</label>
                <input class="text-input" type="datetime-local" [value]="cafeDraft.startsAt" (input)="onPlanInput('cafe', 'startsAt', $event)" />
              </div>
              <div class="studio-actions">
                <button class="secondary-cta" type="button" (click)="setSuggestedTime('cafe')">Preview Suggested Time</button>
                <button class="secondary-cta" *ngIf="cafeEditingShowtimeId" type="button" (click)="cancelEdit('cafe')">Cancel Edit</button>
                <button class="primary-cta cafe" (click)="saveCafePlan()" [disabled]="creatingCafe">{{ creatingCafe ? (cafeEditingShowtimeId ? 'Updating Cafe Plan...' : 'Creating Cafe Plan...') : (cafeEditingShowtimeId ? 'Update Cafe Plan' : 'Create Cafe Plan') }}</button>
              </div>
              <p class="error" *ngIf="cafeCreateError">{{ cafeCreateError }}</p>
            </article>
            <section class="content-block">
              <h2>Published Cafe Plans</h2>
              <div class="list-card" *ngIf="createdCafePlans.length; else noCafePlans">
                <article class="published-card" *ngFor="let plan of createdCafePlans">
                  <span class="card-icon card-icon--cafe"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('cafe', 1)"></path><path [attr.d]="iconPath('cafe', 2)"></path></svg></span>
                  <div class="published-main">
                    <strong>{{ plan.title }}</strong>
                    <div>{{ plan.venueName }}<span *ngIf="plan.cityName">, {{ plan.cityName }}</span></div>
                    <div class="published-meta">{{ plan.address || 'Address not set' }} · Showtime #{{ plan.showtimeId }}<span *ngIf="plan.startsAt"> · {{ formatDateTime(plan.startsAt) }}</span></div>
                  </div>
                  <div class="published-actions">
                    <span class="status-chip success">Active</span>
                    <button class="secondary-cta compact" (click)="startEdit('cafe', plan)">Edit</button>
                    <button class="secondary-cta compact danger" (click)="deletePlan('cafe', plan)">Delete</button>
                  </div>
                </article>
              </div>
              <ng-template #noCafePlans><div class="empty-state card-surface">No cafe plans found.</div></ng-template>
            </section>
          </section>

          <section *ngSwitchCase="'trek'" class="page-body">
            <article class="studio-card">
              <div class="studio-head">
                <div class="studio-title-wrap">
                  <span class="card-icon card-icon--trek"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('trek', 1)"></path><path [attr.d]="iconPath('trek', 2)"></path></svg></span>
                  <div>
                    <h2>Trek Plan Studio</h2>
                    <p>{{ trekEditingShowtimeId ? 'Edit an existing trek plan' : 'Organize an outdoor adventure' }}</p>
                  </div>
                </div>
                <span class="pill pill--trek">Trek</span>
              </div>
              <div class="form-grid form-grid--two">
                <div>
                  <label>City</label>
                  <mat-form-field appearance="outline" class="field">
                    <mat-select [value]="trekDraft.cityId" (selectionChange)="trekDraft.cityId = $event.value">
                      <mat-option [value]="undefined">Select city</mat-option>
                      <mat-option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                <div>
                  <label>Postal Code</label>
                  <input class="text-input" [value]="trekDraft.postalCode" (input)="onPlanInput('trek', 'postalCode', $event, 10)" placeholder="e.g., 400001" />
                </div>
              </div>
              <div>
                <label>Trek Name</label>
                <input class="text-input" [value]="trekDraft.venueName" (input)="onPlanInput('trek', 'venueName', $event)" placeholder="e.g., Rajmachi Fort Trek" />
              </div>
              <div>
                <label>Plan Title</label>
                <input class="text-input" [value]="trekDraft.title" (input)="onPlanInput('trek', 'title', $event)" placeholder="e.g., Weekend Mountain Adventure" />
              </div>
              <div>
                <label>Meeting Point / Address</label>
                <input class="text-input" [value]="trekDraft.address" (input)="onPlanInput('trek', 'address', $event, 200)" placeholder="e.g., Lonavala Railway Station" />
              </div>
              <div>
                <label>Start Date & Time (Optional)</label>
                <input class="text-input" type="datetime-local" [value]="trekDraft.startsAt" (input)="onPlanInput('trek', 'startsAt', $event)" />
              </div>
              <div class="studio-actions">
                <button class="secondary-cta" type="button" (click)="setSuggestedTime('trek')">Preview Suggested Time</button>
                <button class="secondary-cta" *ngIf="trekEditingShowtimeId" type="button" (click)="cancelEdit('trek')">Cancel Edit</button>
                <button class="primary-cta trek" (click)="saveTrekPlan()" [disabled]="creatingTrek">{{ creatingTrek ? (trekEditingShowtimeId ? 'Updating Trek Plan...' : 'Creating Trek Plan...') : (trekEditingShowtimeId ? 'Update Trek Plan' : 'Create Trek Plan') }}</button>
              </div>
              <p class="error" *ngIf="trekCreateError">{{ trekCreateError }}</p>
            </article>
            <section class="content-block">
              <h2>Published Trek Plans</h2>
              <div class="list-card" *ngIf="createdTrekPlans.length; else noTrekPlans">
                <article class="published-card" *ngFor="let plan of createdTrekPlans">
                  <span class="card-icon card-icon--trek"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('trek', 1)"></path><path [attr.d]="iconPath('trek', 2)"></path></svg></span>
                  <div class="published-main">
                    <strong>{{ plan.title }}</strong>
                    <div>{{ plan.venueName }}<span *ngIf="plan.cityName">, {{ plan.cityName }}</span></div>
                    <div class="published-meta">{{ plan.address || 'Meeting point not set' }} · Showtime #{{ plan.showtimeId }}<span *ngIf="plan.startsAt"> · {{ formatDateTime(plan.startsAt) }}</span></div>
                  </div>
                  <div class="published-actions">
                    <span class="status-chip success">Active</span>
                    <button class="secondary-cta compact" (click)="startEdit('trek', plan)">Edit</button>
                    <button class="secondary-cta compact danger" (click)="deletePlan('trek', plan)">Delete</button>
                  </div>
                </article>
              </div>
              <ng-template #noTrekPlans><div class="empty-state card-surface">No trek plans found.</div></ng-template>
            </section>
          </section>

          <section *ngSwitchCase="'maintenance'" class="page-body">
            <article class="studio-card">
              <div class="studio-head">
                <div class="studio-title-wrap">
                  <span class="card-icon card-icon--maintenance"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('maintenance', 1)"></path></svg></span>
                  <div><h2>Maintenance</h2><p>System utilities and operations</p></div>
                </div>
                <span class="pill">Tools</span>
              </div>
              <div class="tool-list">
                <article class="tool-row">
                  <div><strong>Clear Cache</strong><div>Remove cached local admin state</div></div>
                  <button class="secondary-cta compact" (click)="clearLocalAdminCache()">Clear</button>
                </article>
                <article class="tool-row tool-row--muted">
                  <div><strong>Restart Services</strong><div>Reserved for future backend operations</div></div>
                  <span class="status-chip neutral">Coming Soon</span>
                </article>
              </div>
            </article>
            <section class="content-block">
              <h2>System Status</h2>
              <div class="status-grid">
                <article class="status-card"><span class="card-icon card-icon--maintenance"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('maintenance', 1)"></path></svg></span><strong>API Server</strong><span class="status-chip success">Online</span><div>Backend reachable during this session</div></article>
                <article class="status-card"><span class="card-icon card-icon--config"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('config', 1)"></path><path [attr.d]="iconPath('config', 2)"></path></svg></span><strong>Config Service</strong><span class="status-chip" [class.success]="configEntries.length" [class.warning]="!configEntries.length">{{ configEntries.length ? 'Loaded' : 'Pending' }}</span><div>{{ configEntries.length }} config keys available</div></article>
              </div>
            </section>
          </section>

          <section *ngSwitchCase="'config'" class="page-body">
            <article class="studio-card">
              <div class="studio-head">
                <div class="studio-title-wrap">
                  <span class="card-icon card-icon--config"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path [attr.d]="iconPath('config', 1)"></path><path [attr.d]="iconPath('config', 2)"></path></svg></span>
                  <div><h2>Application Config</h2><p>Manage application settings and configurations</p></div>
                </div>
                <span class="pill pill--config">Config</span>
              </div>
              <div class="toolbar-row"><button class="secondary-cta compact" (click)="loadAppConfig()">Refresh Config</button></div>
              <p class="error" *ngIf="configError">{{ configError }}</p>
              <p class="success" *ngIf="configSuccess">{{ configSuccess }}</p>
              <div class="config-stack" *ngIf="configEntries.length; else emptyConfig">
                <article class="config-card" *ngFor="let entry of configEntries">
                  <div class="config-card-top">
                    <span class="config-pill">{{ entry.key }}</span>
                    <button class="edit-btn" (click)="saveConfig(entry)" [disabled]="savingConfigKey === entry.key || !canSaveConfig(entry)">{{ savingConfigKey === entry.key ? '...' : 'Save' }}</button>
                  </div>
                  <div class="config-value">{{ entry.value }}</div>
                  <input class="config-editor-input" [value]="configDraftByKey[entry.key]" [placeholder]="entry.value === '********' ? '********' : entry.value" (input)="onConfigDraftInput(entry.key, $event)" />
                </article>
              </div>
              <ng-template #emptyConfig><div class="empty-state card-surface">No config properties found.</div></ng-template>
              <div class="tip-banner">Tip: Changes take effect immediately. Review carefully before saving.</div>
            </article>
          </section>
        </ng-container>
      </main>
    </section>
  `,
  styles: [
    `
      :host { display:block; }
      .admin-shell { min-height:100vh; display:grid; grid-template-columns:280px minmax(0,1fr); background:#f7f5f2; color:#2f2b28; }
      .sidebar { background:#fbfaf8; border-right:1px solid #ddd6cf; display:flex; flex-direction:column; min-height:100vh; position:sticky; top:0; }
      .brand { padding:28px 30px 24px; border-bottom:1px solid #e1dbd5; }
      .brand-title { font-size:32px; font-weight:700; }
      .brand-subtitle { margin-top:4px; font-size:18px; color:#6e675f; }
      .sidebar-nav { display:grid; gap:10px; padding:24px 18px; }
      .nav-item { height:66px; border-radius:20px; border:1px solid transparent; background:transparent; display:flex; align-items:center; gap:16px; padding:0 22px; font-size:18px; color:#6d665f; cursor:pointer; text-align:left; }
      .nav-item.active { background:#f7efe5; border-color:#e8c6a6; color:#db7a41; font-weight:700; }
      .nav-icon,.card-icon { border-radius:14px; display:inline-flex; align-items:center; justify-content:center; color:#5b544d; flex:0 0 auto; }
      .nav-icon { width:36px; height:36px; background:#ece7e1; }
      .card-icon { width:64px; height:64px; border-radius:20px; }
      .icon-svg { width:20px; height:20px; }
      .card-icon .icon-svg { width:28px; height:28px; }
      .tone-icon .icon-svg { width:24px; height:24px; }
      .nav-icon--dashboard,.card-icon--city { background:#f4e5d4; color:#db7a41; }
      .nav-icon--movie,.card-icon--movie { background:#e4ecff; color:#2c64f4; }
      .nav-icon--cafe,.card-icon--cafe { background:#f4e3b8; color:#c16712; }
      .nav-icon--trek,.card-icon--trek { background:#cdeedc; color:#0f8d60; }
      .nav-icon--maintenance,.card-icon--maintenance { background:#e9edf2; color:#61708a; }
      .nav-icon--config,.card-icon--config { background:#efe7fb; color:#9e30ff; }
      .sidebar-footer { margin-top:auto; padding:20px 18px 28px; color:#7a736b; font-size:15px; display:grid; gap:4px; }
      .content { min-width:0; }
      .page-header { padding:34px 54px 28px; border-bottom:1px solid #ddd6cf; background:#f7f5f2; }
      .page-header h1 { margin:0; font-size:64px; line-height:1; font-weight:700; }
      .page-header p { margin:14px 0 0; font-size:22px; color:#6f6861; }
      .page-body { padding:40px 54px 60px; display:grid; gap:34px; }
      .dashboard-body { gap:40px; }
      .stats-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:22px; }
      .stat-card,.quick-card,.studio-card,.card-surface,.list-card,.status-card { border:1px solid #ddd6cf; border-radius:28px; background:#fffdfb; box-shadow:0 2px 6px rgba(33,24,17,.04); }
      .stat-card { padding:22px; display:grid; gap:12px; }
      .stat-value { font-size:46px; font-weight:700; }
      .stat-label { font-size:18px; color:#6c655e; }
      .content-block h2,.studio-head h2 { margin:0; font-size:28px; }
      .content-block { display:grid; gap:18px; }
      .quick-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; }
      .quick-card { text-align:left; padding:34px; display:grid; gap:18px; cursor:pointer; }
      .quick-card strong { font-size:24px; }
      .quick-card span:last-child { font-size:18px; color:#6b645d; line-height:1.4; }
      .activity-list,.list-card { overflow:hidden; }
      .activity-row,.list-row,.published-card,.tool-row,.config-card { display:flex; align-items:center; gap:18px; padding:24px 26px; border-bottom:1px solid #e7e0da; }
      .activity-row:last-child,.list-row:last-child,.published-card:last-child,.tool-row:last-child,.config-card:last-child { border-bottom:0; }
      .activity-copy,.published-main { min-width:0; flex:1; display:grid; gap:6px; }
      .activity-copy strong,.published-main strong,.list-row strong,.tool-row strong,.config-value { font-size:22px; }
      .activity-copy div,.published-main div,.list-row div,.tool-row div { color:#6f6861; font-size:16px; }
      .activity-meta { color:#7a736b; font-size:16px; white-space:nowrap; }
      .studio-card { padding:32px 36px; display:grid; gap:24px; }
      .studio-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }
      .studio-title-wrap { display:flex; gap:18px; align-items:flex-start; }
      .studio-title-wrap p { margin:6px 0 0; color:#6f6861; font-size:18px; }
      .pill,.status-chip,.config-pill { display:inline-flex; align-items:center; justify-content:center; padding:10px 18px; border-radius:999px; border:1px solid #d6ddea; background:#f5f7fb; font-size:16px; font-weight:700; color:#4c5a73; }
      .pill--movie { color:#2c64f4; border-color:#bcd0ff; background:#eef4ff; }
      .pill--cafe { color:#c16712; border-color:#edc15c; background:#fff5da; }
      .pill--trek { color:#0f8d60; border-color:#98e0be; background:#eefcf4; }
      .pill--config { color:#9e30ff; border-color:#d9b8ff; background:#f5edff; }
      .form-grid { display:grid; gap:18px; }
      .form-grid--two { grid-template-columns:repeat(2,minmax(0,1fr)); }
      label { display:block; margin-bottom:10px; font-size:18px; font-weight:700; }
      .field { width:100%; }
      .text-input { width:100%; height:72px; border:1px solid #e1dbd5; border-radius:22px; background:#f8f6f3; padding:0 22px; font-size:22px; color:#2f2b28; }
      .text-input:focus,.config-editor-input:focus { outline:none; border-color:#d99760; background:#fffdfb; }
      .field-help { margin:10px 0 0; color:#7a736b; font-size:15px; }
      .studio-actions,.toolbar-row { display:flex; gap:16px; }
      .csv-import-box { display:flex; align-items:flex-end; gap:16px; border:1px dashed #ddd6cf; border-radius:22px; padding:18px; background:#fffaf5; }
      .csv-import-box > div { flex:1; }
      .csv-input { width:100%; padding:14px 0; font-size:16px; }
      .primary-cta,.secondary-cta,.edit-btn { height:74px; border-radius:22px; border:1px solid #ded8d2; font-size:22px; font-weight:700; cursor:pointer; padding:0 28px; }
      .primary-cta { flex:1; color:#fff; background:#d7d0c8; border-color:#d7d0c8; }
      .primary-cta.movie { background:#7e8ba1; border-color:#7e8ba1; }
      .primary-cta.cafe,.primary-cta.trek { background:#e7b79c; border-color:#e7b79c; }
      .secondary-cta { flex:1; background:#fffdfb; color:#8a857f; }
      .secondary-cta.compact,.edit-btn { height:56px; padding:0 22px; font-size:18px; flex:0 0 auto; }
      .secondary-cta.danger { color:#b24a3a; border-color:#e7c2bc; }
      .status-chip.success { color:#17a44a; border-color:#9fe2b7; background:#effcf4; }
      .status-chip.warning { color:#c99317; border-color:#ecd48a; background:#fff8dd; }
      .status-chip.neutral { color:#8c867f; border-color:#ddd6cf; background:#f8f6f3; }
      .published-meta { font-size:15px; }
      .published-actions { display:grid; gap:10px; justify-items:end; }
      .tool-list,.config-stack { border:1px solid #e1dbd5; border-radius:24px; overflow:hidden; background:#fffdfb; }
      .tool-row--muted { opacity:.56; }
      .status-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px; }
      .status-card { padding:26px; display:grid; gap:14px; }
      .status-card strong { font-size:22px; }
      .status-card div { color:#6f6861; font-size:16px; }
      .config-card { align-items:stretch; flex-direction:column; }
      .config-card-top { display:flex; align-items:center; justify-content:space-between; gap:16px; }
      .config-pill { padding:8px 14px; border-radius:10px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:18px; font-weight:600; background:#f7f5f2; border-color:#e1dbd5; color:#433d38; }
      .config-editor-input { width:100%; height:64px; border-radius:18px; border:1px solid #e1dbd5; background:#f8f6f3; padding:0 18px; font-size:18px; }
      .tip-banner { border:1px solid #f0cfb0; border-radius:20px; padding:18px 20px; background:#fff8ef; color:#7a6958; font-size:18px; }
      .empty-state { padding:28px; font-size:18px; color:#766f68; }
      .error,.success { margin:0; font-size:17px; font-weight:600; }
      .error { color:#c24224; } .success { color:#1b8a49; }
      @media (max-width:1180px) { .admin-shell { grid-template-columns:1fr; } .sidebar { position:static; min-height:auto; border-right:0; border-bottom:1px solid #ddd6cf; } .sidebar-nav { grid-template-columns:repeat(3,minmax(0,1fr)); } .sidebar-footer { display:none; } }
      @media (max-width:980px) { .page-header { padding:28px 24px 20px; } .page-header h1 { font-size:46px; } .page-header p { font-size:18px; } .page-body { padding:24px; } .stats-grid,.quick-grid,.form-grid--two,.status-grid { grid-template-columns:1fr 1fr; } }
      @media (max-width:720px) { .sidebar-nav { grid-template-columns:1fr 1fr; } .page-header h1 { font-size:36px; } .stats-grid,.quick-grid,.form-grid--two,.status-grid { grid-template-columns:1fr; } .studio-head,.activity-row,.published-card,.list-row,.tool-row,.config-card-top,.studio-actions { flex-direction:column; align-items:stretch; } .published-actions { justify-items:stretch; } .activity-meta { white-space:normal; } .primary-cta,.secondary-cta { width:100%; } }
    `
  ]
})
export class AdminComponent implements OnInit {
  activeSection: AdminSection = 'dashboard';
  cities: City[] = [];
  selectedCityId?: number;
  postalCode = '';
  days = 1;
  syncing = false;
  syncError = '';
  syncResult: MovieSyncResponse | null = null;
  csvImportResult: CsvImportResponse | null = null;
  selectedCsvFile: File | null = null;
  selectedCsvName = '';
  uploadingCsv = false;

  cafeDraft: PlanDraft = this.createEmptyDraft();
  trekDraft: PlanDraft = this.createEmptyDraft();
  cafeEditingShowtimeId: number | null = null;
  trekEditingShowtimeId: number | null = null;
  creatingCafe = false;
  creatingTrek = false;
  cafeCreateError = '';
  trekCreateError = '';

  createdCafePlans: AdminCafeCreateResponse[] = [];
  createdTrekPlans: AdminCafeCreateResponse[] = [];
  dashboardStats: AdminDashboardResponse = { cityCount: 0, cafePlanCount: 0, trekPlanCount: 0, movieShowtimeCount: 0, recentSyncs: [], recentActivities: [] };
  movieSyncHistory: SyncHistoryItem[] = [];
  recentActivity: ActivityItem[] = [];

  configEntries: AdminConfigEntry[] = [];
  configDraftByKey: Record<string, string> = {};
  configError = '';
  configSuccess = '';
  savingConfigKey: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getCities().subscribe((cities) => (this.cities = cities));
    this.loadAppConfig();
    this.loadCafePlans();
    this.loadTrekPlans();
    this.loadDashboard();
  }

  setSection(section: AdminSection) { this.activeSection = section; }

  sectionTitle() {
    return {
      'dashboard': 'Dashboard',
      'movie-sync': 'Movie Sync',
      'cafe': 'Cafe Plans',
      'trek': 'Trek Plans',
      'maintenance': 'Maintenance',
      'config': 'Application Config'
    }[this.activeSection];
  }

  sectionSubtitle() {
    return {
      'dashboard': 'Overview of your operations and quick actions',
      'movie-sync': 'Refresh cinema listings and inspect recent sync runs',
      'cafe': 'Create and review cafe gathering plans',
      'trek': 'Create and review trek adventure plans',
      'maintenance': 'System utilities and operational controls',
      'config': 'Manage application settings and configurations'
    }[this.activeSection];
  }

  iconToneClass(tone: ActivityTone) {
    return {
      movie: 'card-icon--movie',
      cafe: 'card-icon--cafe',
      trek: 'card-icon--trek',
      config: 'card-icon--config',
      maintenance: 'card-icon--maintenance'
    }[tone];
  }

  iconPath(kind: ActivityTone | 'dashboard' | 'city', layer: 1 | 2): string | null {
    const icons: Record<string, [string, string | null]> = {
      dashboard: ['M4 4h7v7H4z', 'M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z'],
      movie: ['M4 5h16v14H4z', 'M8 5v14 M16 5v14 M4 9h4 M4 15h4 M16 9h4 M16 15h4'],
      cafe: ['M5 9h10v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z', 'M15 10h2a3 3 0 0 1 0 6h-2 M8 4v3 M12 4v3 M16 4v3'],
      trek: ['M3 19 8.5 7 14 19H3z', 'M10 19 15 11l6 8h-11z'],
      maintenance: ['M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-3 3-2-2 3-4z', null],
      config: ['M12 8.5A3.5 3.5 0 1 1 12 15.5A3.5 3.5 0 0 1 12 8.5z', 'M12 2v3 M12 19v3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M2 12h3 M19 12h3 M4.9 19.1 7 17 M17 7l2.1-2.1'],
      city: ['M12 21s-5-4.8-5-9a5 5 0 1 1 10 0c0 4.2-5 9-5 9z', 'M12 9.5A2.5 2.5 0 1 1 12 14.5A2.5 2.5 0 0 1 12 9.5z']
    };
    return icons[kind]?.[layer - 1] ?? null;
  }

  onPostalCodeInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.postalCode = (input?.value ?? '').replace(/\D+/g, '').slice(0, 6);
  }

  onCsvSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.selectedCsvFile = file;
    this.selectedCsvName = file?.name ?? '';
    this.csvImportResult = null;
    this.syncError = '';
  }

  onDaysInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const value = Number(input?.value ?? 1);
    if (Number.isFinite(value)) this.days = Math.min(7, Math.max(1, Math.floor(value)));
  }

  onPlanInput(kind: 'cafe' | 'trek', key: keyof PlanDraft, event: Event, maxLength?: number) {
    const input = event.target as HTMLInputElement | null;
    let value = input?.value ?? '';
    if (key === 'postalCode') value = value.replace(/\s+/g, '').slice(0, maxLength ?? 10);
    else if (typeof maxLength === 'number') value = value.slice(0, maxLength);
    const draft = kind === 'cafe' ? this.cafeDraft : this.trekDraft;
    draft[key] = value as never;
    if (kind === 'cafe') this.cafeCreateError = '';
    else this.trekCreateError = '';
  }

  setSuggestedTime(kind: 'cafe' | 'trek') {
    const now = new Date();
    const suggested = new Date(now);
    if (kind === 'trek') {
      suggested.setDate(suggested.getDate() + 1);
      suggested.setHours(6, 0, 0, 0);
    } else {
      suggested.setHours(suggested.getHours() + 2, 0, 0, 0);
    }
    const formatted = this.toDateTimeLocalValue(suggested);
    if (kind === 'cafe') this.cafeDraft.startsAt = formatted;
    else this.trekDraft.startsAt = formatted;
  }

  saveCafePlan() {
    if (!this.cafeDraft.cityId) {
      this.cafeCreateError = 'Select a city.';
      return;
    }
    if (!this.cafeDraft.venueName.trim()) {
      this.cafeCreateError = 'Enter cafe name.';
      return;
    }
    const body = this.planBody(this.cafeDraft);
    this.creatingCafe = true;
    this.cafeCreateError = '';
    const request$ = this.cafeEditingShowtimeId
      ? this.api.updateAdminCafePlan(this.cafeEditingShowtimeId, body)
      : this.api.createAdminCafePlan(body);
    request$.subscribe({
      next: (response) => {
        this.creatingCafe = false;
        this.cafeEditingShowtimeId = null;
        this.cafeDraft = this.createEmptyDraft();
        this.loadCafePlans();
        this.loadDashboard();
      },
      error: (error) => {
        this.creatingCafe = false;
        this.cafeCreateError = error?.error?.message || 'Failed to save cafe plan';
      }
    });
  }

  saveTrekPlan() {
    if (!this.trekDraft.cityId) {
      this.trekCreateError = 'Select a city.';
      return;
    }
    if (!this.trekDraft.venueName.trim()) {
      this.trekCreateError = 'Enter trek name.';
      return;
    }
    const body = this.planBody(this.trekDraft);
    this.creatingTrek = true;
    this.trekCreateError = '';
    const request$ = this.trekEditingShowtimeId
      ? this.api.updateAdminTrekPlan(this.trekEditingShowtimeId, body)
      : this.api.createAdminTrekPlan(body);
    request$.subscribe({
      next: (response) => {
        this.creatingTrek = false;
        this.trekEditingShowtimeId = null;
        this.trekDraft = this.createEmptyDraft();
        this.loadTrekPlans();
        this.loadDashboard();
      },
      error: (error) => {
        this.creatingTrek = false;
        this.trekCreateError = error?.error?.message || 'Failed to save trek plan';
      }
    });
  }

  startEdit(kind: 'cafe' | 'trek', plan: AdminCafeCreateResponse) {
    const draft: PlanDraft = {
      cityId: plan.cityId,
      venueName: plan.venueName ?? '',
      title: plan.title ?? '',
      address: plan.address ?? '',
      postalCode: plan.postalCode ?? '',
      startsAt: plan.startsAt ? this.toDateTimeLocalValue(new Date(plan.startsAt)) : ''
    };
    if (kind === 'cafe') {
      this.cafeEditingShowtimeId = plan.showtimeId;
      this.cafeDraft = draft;
      this.activeSection = 'cafe';
      this.cafeCreateError = '';
    } else {
      this.trekEditingShowtimeId = plan.showtimeId;
      this.trekDraft = draft;
      this.activeSection = 'trek';
      this.trekCreateError = '';
    }
  }

  cancelEdit(kind: 'cafe' | 'trek') {
    if (kind === 'cafe') {
      this.cafeEditingShowtimeId = null;
      this.cafeDraft = this.createEmptyDraft();
      return;
    }
    this.trekEditingShowtimeId = null;
    this.trekDraft = this.createEmptyDraft();
  }

  deletePlan(kind: 'cafe' | 'trek', plan: AdminCafeCreateResponse) {
    const ok = globalThis.confirm(`Delete ${plan.title}? This will remove the plan and dependent lobby data.`);
    if (!ok) return;
    const request$ = kind === 'cafe'
      ? this.api.deleteAdminCafePlan(plan.showtimeId)
      : this.api.deleteAdminTrekPlan(plan.showtimeId);
    request$.subscribe({
      next: () => {
        if (kind === 'cafe') {
          this.loadCafePlans();
          if (this.cafeEditingShowtimeId === plan.showtimeId) this.cancelEdit('cafe');
        } else {
          this.loadTrekPlans();
          if (this.trekEditingShowtimeId === plan.showtimeId) this.cancelEdit('trek');
        }
        this.loadDashboard();
      },
      error: (error) => {
        const message = error?.error?.message || 'Delete failed';
        if (kind === 'cafe') this.cafeCreateError = message;
        else this.trekCreateError = message;
      }
    });
  }

  uploadMoviesCsv() {
    if (!this.selectedCsvFile) {
      this.syncError = 'Select a CSV file.';
      return;
    }
    const cityName = this.cities.find((city) => city.id === this.selectedCityId)?.name;
    if (!this.selectedCityId) {
      this.syncError = 'Select a city before importing the CSV.';
      return;
    }
    this.uploadingCsv = true;
    this.syncError = '';
    this.csvImportResult = null;
    this.api.importMoviesCsv(this.selectedCsvFile, {
      cityId: this.selectedCityId,
      postalCode: this.postalCode.trim() || undefined,
      cityName: cityName || undefined
    }).pipe(timeout(30000)).subscribe({
      next: (resp: CsvImportResponse) => {
        this.uploadingCsv = false;
        this.csvImportResult = resp;
        this.selectedCsvFile = null;
        this.selectedCsvName = '';
        this.loadDashboard();
      },
      error: (error) => {
        this.uploadingCsv = false;
        this.syncError = error?.error?.message || 'CSV import failed';
      }
    });
  }

  runMovieSync() {
    const cityName = this.cities.find((city) => city.id === this.selectedCityId)?.name;
    const pincode = this.postalCode.trim();
    if (!cityName && !pincode) {
      this.syncError = 'Select city or enter pincode.';
      return;
    }
    this.syncing = true;
    this.syncError = '';
    this.api.syncMovies(pincode || undefined, cityName, this.days).subscribe({
      next: (resp: MovieSyncResponse) => {
        this.syncResult = resp;
        this.syncing = false;
        this.loadDashboard();
      },
      error: (error) => {
        this.syncing = false;
        this.syncError = error?.error?.message || 'Sync failed';
      }
    });
  }

  clearLocalAdminCache() {
    try { localStorage.removeItem('admin_panel_cache'); } catch {}
    this.pushActivity({ title: 'Admin cache cleared', subtitle: 'Removed local cached admin state', meta: 'Just now', tone: 'maintenance' });
  }

  loadDashboard() {
    this.api.getAdminDashboard(true).subscribe({
      next: (response) => {
        this.dashboardStats = response;
        this.movieSyncHistory = (response.recentSyncs ?? []).map((sync) => ({
          title: [sync.cityName || 'Selected location', sync.postalCode].filter(Boolean).join(' · '),
          subtitle: `${sync.eventsUpserted} events · ${sync.venuesUpserted} venues · ${sync.showtimesUpserted} showtimes`,
          meta: this.formatRelativeTime(sync.createdAt),
          status: sync.status === 'SUCCESS' ? 'Success' : 'No Data'
        }));
        this.recentActivity = (response.recentActivities ?? []).map((item) => ({
          title: item.title,
          subtitle: item.detail || 'Admin action recorded',
          meta: this.formatRelativeTime(item.createdAt),
          tone: this.activityToneFromActionType(item.actionType)
        }));
      }
    });
  }

  loadAppConfig() {
    this.configError = '';
    this.configSuccess = '';
    this.api.getAdminConfig(true).subscribe({
      next: (response) => {
        this.configEntries = response?.entries ?? [];
        this.configDraftByKey = {};
        for (const entry of this.configEntries) this.configDraftByKey[entry.key] = entry.value === '********' ? '' : entry.value;
      },
      error: (error) => {
        this.configEntries = [];
        this.configError = error?.error?.message || 'Failed to load config';
      }
    });
  }

  loadCafePlans() {
    this.api.getAdminCafePlans(true).subscribe({ next: (response) => { this.createdCafePlans = response?.plans ?? []; } });
  }

  loadTrekPlans() {
    this.api.getAdminTrekPlans(true).subscribe({ next: (response) => { this.createdTrekPlans = response?.plans ?? []; } });
  }

  onConfigDraftInput(key: string, event: Event) {
    const input = event.target as HTMLInputElement | null;
    this.configDraftByKey[key] = input?.value ?? '';
    this.configSuccess = '';
  }

  canSaveConfig(entry: AdminConfigEntry): boolean {
    if (entry.value === '********') return (this.configDraftByKey[entry.key] ?? '').trim().length > 0;
    return (this.configDraftByKey[entry.key] ?? '') !== entry.value;
  }

  saveConfig(entry: AdminConfigEntry) {
    if (!this.canSaveConfig(entry)) return;
    const value = this.configDraftByKey[entry.key] ?? '';
    this.savingConfigKey = entry.key;
    this.configError = '';
    this.configSuccess = '';
    this.api.updateAdminConfig(entry.key, value).subscribe({
      next: (updated) => {
        const index = this.configEntries.findIndex((item) => item.key === entry.key);
        if (index >= 0) this.configEntries[index] = updated;
        this.configDraftByKey[entry.key] = updated.value === '********' ? '' : updated.value;
        this.savingConfigKey = null;
        this.configSuccess = `Saved ${entry.key}`;
        this.loadDashboard();
      },
      error: (error) => {
        this.savingConfigKey = null;
        this.configError = error?.error?.message || `Failed to save ${entry.key}`;
      }
    });
  }

  private activityToneFromActionType(actionType?: string | null): ActivityTone {
    const value = (actionType ?? '').toUpperCase();
    if (value.includes('MOVIE') || value.includes('SYNC')) return 'movie';
    if (value.includes('CAFE')) return 'cafe';
    if (value.includes('TREK')) return 'trek';
    if (value.includes('CONFIG')) return 'config';
    return 'maintenance';
  }

  private formatRelativeTime(value?: string | null) {
    if (!value) return 'Unknown time';
    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  formatDateTime(value?: string | null) {
    if (!value) return 'Time not set';
    return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  private pushActivity(item: ActivityItem) {
    this.recentActivity.unshift(item);
    this.recentActivity = this.recentActivity.slice(0, 8);
  }

  private planBody(draft: PlanDraft) {
    return {
      cityId: draft.cityId!,
      venueName: draft.venueName.trim(),
      title: this.trimToUndefined(draft.title) ?? draft.venueName.trim(),
      startsAt: this.toIsoOrUndefined(draft.startsAt),
      address: this.trimToUndefined(draft.address),
      postalCode: this.trimToUndefined(draft.postalCode)
    };
  }

  private createEmptyDraft(): PlanDraft { return { cityId: undefined, venueName: '', title: '', address: '', postalCode: '', startsAt: '' }; }
  private trimToUndefined(value: string): string | undefined { const t = value.trim(); return t ? t : undefined; }
  private toIsoOrUndefined(value: string): string | undefined { return value ? new Date(value).toISOString() : undefined; }
  private toDateTimeLocalValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
