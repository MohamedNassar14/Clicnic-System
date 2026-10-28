import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import {
  DoctorExperience,
  DoctorProfileService,
  DoctorProfileUpdatePayload,
} from './doctor-profile.service';
import { HttpClient } from '@angular/common/http';

interface DoctorProfileField {
  label: string;
  value: string;
}

interface FieldDefinition {
  label: string;
  keys: string[];
}

const PROFILE_FIELDS: FieldDefinition[] = [
  { label: 'الاسم', keys: ['name', 'full_name', 'doctor_name'] },
  { label: 'البريد الإلكتروني', keys: ['email'] },
  { label: 'رقم الهاتف', keys: ['phone', 'phone_number', 'mobile'] },
  { label: 'التخصص', keys: ['specialization', 'specialty', 'speciality'] },
  { label: 'اللقب المهني', keys: ['title'] },
  { label: 'المؤهل العلمي', keys: ['qualification', 'qualifications', 'degree'] },
  { label: 'سنوات الخبرة', keys: ['years_of_experience', 'experience_years', 'experience'] },
  { label: 'الخبرات العملية', keys: ['experiences'] },
  { label: 'العنوان', keys: ['address'] },
  { label: 'النوع', keys: ['gender'] },
  { label: 'تاريخ الميلاد', keys: ['date_of_birth', 'birth_date'] },
  { label: 'نبذة', keys: ['bio', 'about', 'description'] },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readProfileSources(response: unknown): Record<string, unknown>[] {
  if (!isRecord(response)) {
    return [];
  }

  const sources = [response];
  for (const key of ['profile', 'doctor', 'data', 'user', 'personal_information', 'professional_information']) {
    const value = response[key];
    if (isRecord(value)) {
      sources.push(value);
      for (const nestedKey of ['profile', 'doctor', 'user', 'personal_information', 'professional_information']) {
        const nestedValue = value[nestedKey];
        if (isRecord(nestedValue)) {
          sources.push(nestedValue);
        }
      }
    }
  }

  return sources;
}



function readFieldValue(
  sources: Record<string, unknown>[],
  keys: string[],
): string {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        const items = value.map((item) => {
          if (typeof item === 'string') {
            return item.trim();
          }
          if (isRecord(item)) {
            const place = readFieldValue([item], ['place']);
            const position = readFieldValue([item], ['position']);
            const from = readFieldValue([item], ['from']);
            const to = readFieldValue([item], ['to']);
            const period = from || to ? ` (${from}${from && to ? ' - ' : ''}${to})` : '';
            return [place, position].filter(Boolean).join(' - ') + period;
          }
          return '';
        }).filter(Boolean);
        if (items.length > 0) {
          return items.join('\n');
        }
      }
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }
  }

  return '';
}

function readDoctorProfile(response: unknown): DoctorProfileField[] {
  const sources = readProfileSources(response);
  if (sources.length === 0) {
    return [];
  }

  return PROFILE_FIELDS.flatMap(({ label, keys }) => {
    const value = readFieldValue(sources, keys);
    return value ? [{ label, value }] : [];
  });
}

type ExperienceForm = FormGroup<{
  place: FormControl<string>;
  position: FormControl<string>;
  from: FormControl<number | null>;
  to: FormControl<number | null>;
}>;

@Component({
  selector: 'app-doctor-profile',
  imports: [DialogModule, ReactiveFormsModule],
  templateUrl: './doctor-profile.html',
  styleUrl: './doctor-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorProfile implements OnInit {
  private readonly profileService = inject(DoctorProfileService);

  readonly profileFields = signal<DoctorProfileField[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly isEditDialogVisible = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly doctorForm = new FormGroup({
    specialty: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    years_of_experience: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    bio: new FormControl('', { nonNullable: true }),
    qualifications: new FormArray<FormControl<string>>([]),
    experiences: new FormArray<ExperienceForm>([]),
  });

  get qualifications(): FormArray<FormControl<string>> {
    return this.doctorForm.controls.qualifications;
  }

  get experiences(): FormArray<ExperienceForm> {
    return this.doctorForm.controls.experiences;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.profileService.getDoctorProfile().subscribe({
      next: (response) => {
        if (isRecord(response) && response['status'] === false) {
          this.profileFields.set([]);
          this.errorMessage.set(
            typeof response['msg'] === 'string' && response['msg']
              ? response['msg']
              : 'تعذر تحميل بيانات الملف الشخصي.',
          );
          this.isLoading.set(false);
          return;
        }

        this.setFormFromProfile(response);
        const fields = readDoctorProfile(response);
        this.profileFields.set(fields);
        this.errorMessage.set(fields.length > 0 ? '' : 'لم يتم العثور على بيانات الملف الشخصي.');
        this.isLoading.set(false);
      },
      error: () => {
        this.profileFields.set([]);
        this.errorMessage.set('تعذر تحميل بيانات الملف الشخصي. تحقق من اتصالك وحاول مرة أخرى.');
        this.isLoading.set(false);
      },
    });
  }

  openEditDialog(): void {
    this.saveError.set('');
    this.isEditDialogVisible.set(true);
  }

  closeEditDialog(): void {
    if (this.isSaving()) {
      return;
    }

    this.isEditDialogVisible.set(false);
    this.saveError.set('');
  }

  addQualification(): void {
    this.qualifications.push(new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }));
  }

  removeQualification(index: number): void {
    this.qualifications.removeAt(index);
  }

  addExperience(): void {
    this.experiences.push(this.createExperienceForm());
  }

  removeExperience(index: number): void {
    this.experiences.removeAt(index);
  }

  saveProfile(): void {
    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    const formValue = this.doctorForm.getRawValue();
    if (formValue.years_of_experience === null) {
      this.doctorForm.controls.years_of_experience.markAsTouched();
      return;
    }

    const payload: DoctorProfileUpdatePayload = {
      specialty: formValue.specialty.trim(),
      title: formValue.title.trim(),
      years_of_experience: formValue.years_of_experience,
      bio: formValue.bio.trim(),
      qualifications: formValue.qualifications.map((qualification) => qualification.trim()),
      experiences: formValue.experiences.map((experience) => ({
        place: experience.place.trim(),
        position: experience.position.trim(),
        from: experience.from ?? 0,
        to: experience.to ?? 0,
      })),
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');
    this.profileService.updateDoctorProfile(payload).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (isRecord(response) && response['status'] === false) {
          this.saveError.set(
            typeof response['msg'] === 'string' && response['msg']
              ? response['msg']
              : 'تعذر حفظ التعديلات.',
          );
          return;
        }

        this.profileFields.update((fields) => this.applyFormValues(fields, payload));
        this.isEditDialogVisible.set(false);
        this.saveSuccess.set('تم تحديث بيانات الملف الشخصي بنجاح.');
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('تعذر حفظ التعديلات. تحقق من اتصالك وحاول مرة أخرى.');
      },
    });
  }

  private setFormFromProfile(response: unknown): void {
    const sources = readProfileSources(response);
    const specialty = this.readStringFromSources(sources, ['specialty', 'specialization', 'speciality']);
    const title = this.readStringFromSources(sources, ['title']);
    const years = this.readNumberFromSources(sources, ['years_of_experience', 'experience_years']);
    const bio = this.readStringFromSources(sources, ['bio', 'about', 'description']);
    const qualifications = this.readStringArrayFromSources(sources, ['qualifications']);
    const experiences = this.readExperiencesFromSources(sources);

    this.doctorForm.controls.specialty.setValue(specialty);
    this.doctorForm.controls.title.setValue(title);
    this.doctorForm.controls.years_of_experience.setValue(years);
    this.doctorForm.controls.bio.setValue(bio);
    this.qualifications.clear();
    qualifications.forEach((qualification) => {
      this.qualifications.push(new FormControl(qualification, {
        nonNullable: true,
        validators: [Validators.required],
      }));
    });
    this.experiences.clear();
    experiences.forEach((experience) => this.experiences.push(this.createExperienceForm(experience)));
  }

  private readStringFromSources(sources: Record<string, unknown>[], keys: string[]): string {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string') {
          return value;
        }
      }
    }
    return '';
  }

  private readNumberFromSources(sources: Record<string, unknown>[], keys: string[]): number | null {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
          return Number(value);
        }
      }
    }
    return null;
  }

  private readStringArrayFromSources(sources: Record<string, unknown>[], keys: string[]): string[] {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (Array.isArray(value)) {
          return value.filter((item): item is string => typeof item === 'string');
        }
      }
    }
    return [];
  }

  private readExperiencesFromSources(sources: Record<string, unknown>[]): DoctorExperience[] {
    for (const source of sources) {
      const value = source['experiences'];
      if (Array.isArray(value)) {
        return value.flatMap((item) => {
          if (!isRecord(item)) {
            return [];
          }
          const place = item['place'];
          const position = item['position'];
          const from = Number(item['from']);
          const to = Number(item['to']);
          if (
            typeof place !== 'string'
            || typeof position !== 'string'
            || !Number.isFinite(from)
            || !Number.isFinite(to)
          ) {
            return [];
          }
          return [{ place, position, from, to }];
        });
      }
    }
    return [];
  }

  private createExperienceForm(experience?: DoctorExperience): ExperienceForm {
    return new FormGroup({
      place: new FormControl(experience?.place ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      position: new FormControl(experience?.position ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      from: new FormControl<number | null>(experience?.from ?? null, Validators.required),
      to: new FormControl<number | null>(experience?.to ?? null, Validators.required),
    });
  }

  private applyFormValues(
    fields: DoctorProfileField[],
    payload: DoctorProfileUpdatePayload,
  ): DoctorProfileField[] {
    const updatedValues: Record<string, string> = {
      'التخصص': payload.specialty,
      'اللقب المهني': payload.title,
      'سنوات الخبرة': String(payload.years_of_experience),
      'المؤهل العلمي': payload.qualifications.join('\n'),
      'الخبرات العملية': payload.experiences
        .map(({ place, position, from, to }) => `${place} - ${position} (${from} - ${to})`)
        .join('\n'),
      'نبذة': payload.bio,
    };
    const updatedLabels = new Set(Object.keys(updatedValues));
    const nextFields = fields.filter((field) => !updatedLabels.has(field.label));
    return [
      ...nextFields,
      ...Object.entries(updatedValues)
        .filter(([, value]) => value)
        .map(([label, value]) => ({ label, value })),
    ];
  }


    private http = inject(HttpClient);

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploading = false;

  private readonly apiUrl =
    'https://api.flexlify.com/api/doctor/profile/photo';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  uploadPhoto(): void {
    if (!this.selectedFile || this.uploading) return;

    const formData = new FormData();

    formData.append('photo', this.selectedFile);

    this.uploading = true;

    this.http.post(
      `${this.apiUrl}?photo_path`,
      formData
    ).subscribe({
      next: (response) => {
        console.log('Upload success:', response);
        this.uploading = false;
      },
      error: (error) => {
        console.error('Upload failed:', error);
        this.uploading = false;
      }
    });
  }
}
