import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AdminStand } from './admin-stand';

describe('AdminStand', () => {
  let component: AdminStand;
  let fixture: ComponentFixture<AdminStand>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminStand],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminStand);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse comma-separated keywords accurately', () => {
    expect(component.parseKeywords('pasta, primo, sugo, guanciale')).toEqual([
      'pasta',
      'primo',
      'sugo',
      'guanciale',
    ]);
  });
});
