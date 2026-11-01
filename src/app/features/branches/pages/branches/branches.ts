import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Icons } from '../../../../shared/components/icons/icons';
import { BranchesService, ClinicLocation, ClinicLocationsResponse } from '../../services/branches';
import Swal from 'sweetalert2';

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
  private readonly platformId = inject(PLATFORM_ID);

  readonly branches = signal<Branch[]>([]);
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly isAddDialogVisible = signal(false);
  readonly editingBranchId = signal<number | null>(null);
  readonly isSaving = signal(false);
  readonly deletingBranchId = signal<number | null>(null);
  readonly requestError = signal('');
  readonly actionError = signal('');
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
    this.editingBranchId.set(null);
    this.requestError.set('');
    this.isAddDialogVisible.set(true);
  }

  editBranch(branch: Branch): void {
    this.branchForm.reset({
      name: branch.name,
      address: branch.address,
      examinationPrice: branch.examinationPrice,
      consultationPrice: branch.consultationPrice,
    });
    this.editingBranchId.set(branch.id);
    this.requestError.set('');
    this.isAddDialogVisible.set(true);
  }

  closeBranchDialog(): void {
    if (this.isSaving()) {
      return;
    }

    this.isAddDialogVisible.set(false);
    this.editingBranchId.set(null);
    this.requestError.set('');
  }

  saveBranch(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const formValue = this.branchForm.getRawValue();
    if (formValue.consultationPrice === null || formValue.examinationPrice === null) {
      this.branchForm.markAllAsTouched();
      return;
    }

    const payload = {
      name: formValue.name,
      address: formValue.address,
      consultation_price: formValue.consultationPrice,
      checkup_price: formValue.examinationPrice,
    };
    const editingBranchId = this.editingBranchId();
    this.isSaving.set(true);
    this.requestError.set('');

    const saveRequest = editingBranchId === null
      ? this.branchesService.createClinicLocation(payload)
      : this.branchesService.updateClinicLocation(editingBranchId, payload);

    saveRequest.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isAddDialogVisible.set(false);
        this.editingBranchId.set(null);
        this.loadBranches();
        Swal.fire({
          html: `
                    <div style="display: flex; flex-direction: column; align-items: center;"><div>
                   <svg width="75" height="75" viewBox="0 0 113 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="56.5" cy="56.5" r="51.5" stroke="#009917" stroke-width="10" />
                    <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M26.8863 57.7045C25.7046 58.8707 25.7046 60.7628 26.8863 61.9289L43.299 78.1254C44.4807 79.2915 46.3981 79.2915 47.5798 78.1254L86.113 40.1C87.2957 38.9328 87.2957 37.0417 86.113 35.8746C84.9313 34.7085 83.0139 34.7085 81.8322 35.8746L45.4394 71.7878L31.1681 57.7035C29.9854 56.5374 28.069 56.5374 26.8863 57.7045Z"
                    fill="#009917" />
                   </svg>
                                   </div>
                                   <h2 style="margin-top: 16px; font-size: 20px; font-weight: bold;">تم تعديل الفرع بنجاح</h2>
                                  </div>
                                  `,
          confirmButtonColor: '#1aaa55',
          confirmButtonText: 'يمكنك المتابعة',
          customClass: {
            confirmButton: 'custom-confirm-btn',
            popup: 'custom-swal-popup',
            htmlContainer: 'custom-text',
          },
          showCloseButton: false,
          showCancelButton: false,
        })
      },
      error: () => {
        this.isSaving.set(false);
        this.requestError.set(editingBranchId === null
          ? 'تعذر إضافة الفرع. حاول مرة أخرى.'
          : 'تعذر تعديل الفرع. حاول مرة أخرى.');
      },
    });
  }

  deleteBranch(branch: Branch): void {
    if (
      !isPlatformBrowser(this.platformId)
      || this.deletingBranchId() !== null
      || !window.confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟`)
    ) {
      return;
    }

    this.deletingBranchId.set(branch.id);
    this.actionError.set('');
    this.branchesService.deleteClinicLocation(branch.id).subscribe({
      next: () => {
        this.deletingBranchId.set(null);
        this.branches.update((branches) => branches.filter((item) => item.id !== branch.id));
        Swal.fire({
          html: `
               <div style="display: flex; flex-direction: column; align-items: center;"><div>
                   <svg width="75" height="75" viewBox="0 0 113 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="56.5" cy="56.5" r="51.5" stroke="#009917" stroke-width="10" />
                    <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M26.8863 57.7045C25.7046 58.8707 25.7046 60.7628 26.8863 61.9289L43.299 78.1254C44.4807 79.2915 46.3981 79.2915 47.5798 78.1254L86.113 40.1C87.2957 38.9328 87.2957 37.0417 86.113 35.8746C84.9313 34.7085 83.0139 34.7085 81.8322 35.8746L45.4394 71.7878L31.1681 57.7035C29.9854 56.5374 28.069 56.5374 26.8863 57.7045Z"
                    fill="#009917" />
                   </svg>
                    </div>
                    <h2 style="margin-top: 16px; font-size: 20px; font-weight: bold;">تم حذف الفرع بنجاح</h2>
                   </div>
                  `,
          confirmButtonColor: '#1aaa55',
          confirmButtonText: 'يمكنك المتابعة',
          customClass: {
            confirmButton: 'custom-confirm-btn',
            popup: 'custom-swal-popup',
            htmlContainer: 'custom-text',
          },
          showCloseButton: false,
          showCancelButton: false,
        })
      },
      error: () => {
        this.deletingBranchId.set(null);
        this.actionError.set('تعذر حذف الفرع. حاول مرة أخرى.');
      },
    });
  }
}