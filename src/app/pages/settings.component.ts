import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Profile } from '../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="profile-page">
      <h1>Profile</h1>

      <div class="card">
        <div class="avatar-wrap">
          <div
            class="avatar"
            [style.backgroundImage]="profile?.avatarUrl ? 'url(' + profile?.avatarUrl + ')' : ''"
            [class.has-image]="!!profile?.avatarUrl"
          >
            {{ profile?.avatarUrl ? '' : initials(profile?.displayName || '') }}
          </div>
          <div class="avatar-hint">Upload a profile photo (URL)</div>
        </div>

        <label class="field">
          <span>Display name</span>
          <input [(ngModel)]="form.displayName" placeholder="Your name" />
        </label>

        <label class="field">
          <span>Upload photo</span>
          <input type="file" accept="image/*" (change)="onFileSelected($event)" />
        </label>

        <label class="field">
          <span>Bio</span>
          <textarea [(ngModel)]="form.bioShort" rows="3" placeholder="Tell people something short"></textarea>
        </label>
      </div>

      <div class="card">
        <h2>Personality tags</h2>
        <p class="muted">Pick a few tags to help with icebreakers.</p>
        <div class="tags">
          <button
            type="button"
            class="tag"
            *ngFor="let tag of availableTags"
            [class.selected]="selectedTags.includes(tag)"
            (click)="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <div class="card">
        <h2>Blocked users</h2>
        <p class="muted" *ngIf="blocked.length === 0">You have not blocked anyone.</p>
        <div class="blocked-list">
          <div class="blocked" *ngFor="let user of blocked">
            <span>{{ user.displayName }}</span>
          </div>
        </div>
      </div>

      <button class="save-btn" (click)="save()">Save profile</button>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #000000;
        background: #ffffff;
      }
      .profile-page {
        padding: 22px 18px 40px;
        display: grid;
        gap: 18px;
      }
      h1 {
        margin: 0;
        font-size: 32px;
      }
      .card {
        border: 1px solid #ececec;
        border-radius: 20px;
        padding: 16px;
        display: grid;
        gap: 12px;
        background: #ffffff;
      }
      .avatar-wrap {
        display: grid;
        gap: 8px;
        justify-items: start;
      }
      .avatar {
        width: 72px;
        height: 72px;
        border-radius: 999px;
        background: #e6e6e6;
        background-size: cover;
        background-position: center;
        display: grid;
        place-items: center;
        font-weight: 700;
      }
      .avatar-hint {
        color: rgba(0, 0, 0, 0.55);
        font-size: 14px;
      }
      .field {
        display: grid;
        gap: 6px;
        font-size: 14px;
      }
      .field input,
      .field textarea {
        border: 1px solid #e3e3e3;
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 15px;
        font-family: inherit;
        outline: none;
        background: #fafafa;
      }
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .tag {
        border: 1px solid #e0e0e0;
        background: #ffffff;
        padding: 8px 14px;
        border-radius: 999px;
        cursor: pointer;
        font-size: 14px;
      }
      .tag.selected {
        background: #fc5054;
        color: #ffffff;
        border-color: #fc5054;
      }
      .muted {
        color: rgba(0, 0, 0, 0.55);
      }
      .blocked-list {
        display: grid;
        gap: 8px;
      }
      .blocked {
        padding: 8px 12px;
        background: #f3f3f3;
        border-radius: 12px;
      }
      .save-btn {
        border: none;
        background: #fc5054;
        color: #ffffff;
        font-weight: 600;
        padding: 14px 16px;
        border-radius: 16px;
        cursor: pointer;
      }
    `
  ]
})
export class SettingsComponent implements OnInit {
  profile?: Profile;
  blocked: Profile[] = [];
  availableTags = ['Curious', 'Chill', 'Planner', 'Talkative', 'Quiet', 'Movie Buff', 'Foodie', 'Night Owl'];
  selectedTags: string[] = [];
  form = {
    displayName: '',
    avatarUrl: '',
    bioShort: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProfile().subscribe((profile) => {
      this.profile = profile;
      this.selectedTags = profile.personalityTags ? [...profile.personalityTags] : [];
      this.form.displayName = profile.displayName || '';
        this.form.avatarUrl = profile.avatarUrl || '';
      this.form.bioShort = profile.bioShort || '';
    });
    this.api.blockedUsers().subscribe((users) => (this.blocked = users));
  }

  toggleTag(tag: string) {
    if (this.selectedTags.includes(tag)) {
      this.selectedTags = this.selectedTags.filter((t) => t !== tag);
    } else {
      this.selectedTags = [...this.selectedTags, tag];
    }
  }

  save() {
    this.api
      .updateProfile({
        displayName: this.form.displayName,
        avatarUrl: this.form.avatarUrl || null,
        bioShort: this.form.bioShort,
        personalityTags: this.selectedTags
      })
      .subscribe((profile) => {
        this.profile = profile;
      });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.form.avatarUrl = result;
    };
    reader.readAsDataURL(file);
  }

  initials(name: string) {
    if (!name) return '';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
