import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Icons } from '../../../../shared/components/icons/icons';
import { BranchesService, ClinicLocation, ClinicLocationsResponse } from '../../services/branches';

interface Branch {
  id: number;
  name: string;
  address: string;
  examinationPrice: number;
  consultationPrice: number;
}

@Component({
  selector: 'app-branches',
  imports: [DialogModule, Icons, ReactiveFormsModule],
  templateUrl: './branches.html',
  styleUrl: './branches.scss',
})
export class Branches implements OnInit {
  private readonly branchesService = inject(BranchesService);

  readonly branches = signal<Branch[]>([]);
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly isAddDialogVisible = signal(false);
  readonly isSaving = signal(false);
  readonly requestError = signal('');
  readonly branchForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    examinationPrice: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    consultationPrice: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.branchesService.getClinicLocations().subscribe({
      next: (response) => {
        const locations = this.getLocationList(response);
        this.branches.set(locations.map((location) => ({
          id: location.id,
          name: location.name,
          address: location.address,
          examinationPrice: location.checkup_price,
          consultationPrice: location.consultation_price,
        })));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('تعذر تحميل الفروع. حاول مرة أخرى.');
      },
    });
  }

  private getLocationList(response: ClinicLocation[] | ClinicLocationsResponse): ClinicLocation[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.data ?? response.clinic_locations ?? [];
  }

  addBranch() {
    this.branchForm.reset({ name: '', address: '', examinationPrice: null, consultationPrice: null });
    this.requestError.set('');
    this.isAddDialogVisible.set(true);
  }

  saveBranch(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const formValue = this.branchForm.getRawValue();
    const payload = {
      name: formValue.name,
      address: formValue.address,
      consultation_price: formValue.consultationPrice as number,
      checkup_price: formValue.examinationPrice as number,
    };
    this.isSaving.set(true);
    this.requestError.set('');

    this.branchesService.createClinicLocation(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isAddDialogVisible.set(false);
        this.loadBranches();
      },
      error: () => {
        this.isSaving.set(false);
        this.requestError.set('تعذر إضافة الفرع. حاول مرة أخرى.');
      },
    });
  }
}