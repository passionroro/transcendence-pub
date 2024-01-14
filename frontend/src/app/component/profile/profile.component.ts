import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/service/auth.service';
import { Observable, lastValueFrom, map } from 'rxjs';
import { AwsService } from 'src/app/service/aws.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  @ViewChild('usernameDialogTemplate') usernameDialogTemplate!: TemplateRef<any>;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('deleteDialogTemplate') deleteDialogTemplate!: TemplateRef<any>;
  @ViewChild('enableTFADialogTemplate') enableTFADialogTemplate!: TemplateRef<any>;
  @ViewChild('disableTFADialogTemplate') disableTFADialogTemplate!: TemplateRef<any>;
  msg: string | undefined;
  err: string | undefined;
  newUsername: string = '';
  username: string = localStorage.getItem('user') || 'dear user';
  qrCode: string = '../../../assets/loading.gif';
  avatarUrl: string | null = null;
  tfaPassword: string = '';
  isEnableTFA$: Observable<boolean>;

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private authService: AuthService,
    private awsService: AwsService,
    private cdr: ChangeDetectorRef,
    ) {
      this.isEnableTFA$ = this.TFAStatus();
      this.onSaveClick = this.onSaveClick.bind(this);
      this.onEnableClick = this.onEnableClick.bind(this);
      this.onDisableClick = this.onDisableClick.bind(this);
    }

  async ngOnInit() {
    this.isEnableTFA$ = this.TFAStatus();
    await this.fetchAvatar();
  }

  // Fetch the avatar from the server
  async fetchAvatar(): Promise<void> {
    this.avatarUrl = '../../../assets/default.jpg';
    this.awsService.fetchS3Object().subscribe((res: Blob) => {
      if (!res) return;
      const url = window.URL.createObjectURL(res);
      this.avatarUrl = url;
    });
  }

  // Open the change username dialog
  openChangeUsernameDialog() {
    this.dialog.open(this.usernameDialogTemplate);
  }

  // Change the username
  async onSaveClick() {
    if (!/^[a-zA-Z0-9]{3,12}$/.test(this.newUsername)) {
      this.newUsername = '';
      this.dialog.closeAll();
      this.err = 'Username must be between 3 and 12 characters long and contain only letters and numbers';
      return;
    }
    this.username = this.newUsername;
    this.newUsername = '';
    const response: any = await lastValueFrom(this.http.post
      (`${environment.BACK_URL}/friends/changeUsername`, {username: this.username}, { headers: this.authService.getHeader() }));
      
      if (response && response.err) {
        this.dialog.closeAll();
        this.err = response.err;
        return;
      }
      localStorage.removeItem('user');
      localStorage.setItem('user', this.username);
      this.dialog.closeAll();
      this.msg = response.msg;
  }

  // Cancel and close the dialog
  onCancelClick() {
    this.newUsername = '';
    this.tfaPassword = '';
    this.dialog.closeAll();
  }

  // Trigger the file input click event when the button is clicked
  openFileInput() {
    this.fileInput.nativeElement.click();
  }

  // Crop the image to a square
  async cropImage(file: Blob): Promise<Blob> {
    return new Promise(async (resolve) => {
      const image = new Image();
      image.src = URL.createObjectURL(file);
  
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const size = Math.min(image.width, image.height);
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, size, size);
        canvas.toBlob(async (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        }, 'image/jpeg');
      };
    });
  }

  // Fetch avatar after uploading a new one
  async fetchAvatar2() {
    this.awsService.fetchS3Object().subscribe((res: Blob) => {
      if (!res) return;
      this.avatarUrl = window.URL.createObjectURL(res);
      this.cdr.detectChanges();
    });
    return;
  }

  // Upload the image to the server
  async onFileSelected(event: any) {
    const file = event.target.files[0];
    event.target.value = '';

    if (file) {
      try {
        const croppedFile = await this.cropImage(file);

        const formData = new FormData();
        formData.append('file', croppedFile);

        const response: any = await lastValueFrom(this.http.post
        (`${environment.BACK_URL}/avatar/upload`, formData, { headers: this.authService.getHeader() }));
        if (response && response.err) {
          this.dialog.closeAll();
          this.err = response.err;
          return;
        }
        this.dialog.closeAll();
        await this.fetchAvatar2();
        this.msg = this.msg = response.msg;
      } catch (error) {
        console.error(error);
      }
    }
  }

  // Open the delete avatar dialog (confirm delete)
  openDeleteAvatarDialog() {
    this.dialog.open(this.deleteDialogTemplate);
  }

  // Delete the avatar
  async onDeleteClick() {
    const response: any = await lastValueFrom(this.http.delete(`${environment.BACK_URL}/avatar/delete`, { headers: this.authService.getHeader() }));
    if (response && response.err) {
      this.dialog.closeAll();
      this.err = response.err;
      return;
    }
    this.dialog.closeAll();
    this.avatarUrl = '../../../assets/default.jpg';
    this.msg = this.msg = response.msg;
  }

  // return a boolean observable that indicates whether TFA is enabled
  TFAStatus(): Observable<boolean> {    
    return this.http.get(`${environment.BACK_URL}/tfa/status`, { headers: this.authService.getHeader() })
      .pipe(
        map((response: any) => response.enabled),
      );
  }

  // Open the enable TFA dialog
  async enableTFADialog() {
    const response: any = await this.authService.generateQRCode();
    if (response && response.err) {
      this.dialog.closeAll();
      this.err = response.err;
      return;
    }

    this.qrCode = response.qrCode;

    this.dialog.open(this.enableTFADialogTemplate);

    return;
  }

  // Enable TFA after the user enters the code
  async onEnableClick() {
    this.dialog.closeAll();
    if (!/^\d{6}$/.test(this.tfaPassword)) {
      this.tfaPassword = '';
      this.err = 'Code must be 6 digits';
      return;
    }

    const verifyResponse: any = await this.authService.verifyTFA(this.tfaPassword);
    this.tfaPassword = '';
    if (verifyResponse && verifyResponse.err) {
      this.err = verifyResponse.err;
      return;
    } else if (verifyResponse.ok === true) {
      const enableResponse: any = await this.authService.enableTFA();
      this.isEnableTFA$ = this.TFAStatus();
      this.msg = enableResponse.msg;
    }
  }

  // Open the disable TFA dialog
  disableTFADialog() {
    this.dialog.open(this.disableTFADialogTemplate);
  }

  // Disable TFA after the user enters the code
  async onDisableClick() {
    this.dialog.closeAll();
    if (!/^\d{6}$/.test(this.tfaPassword)) {
      this.tfaPassword = '';
      this.err = 'Code must be 6 digits';
      return;
    }

    const verifyResponse: any = await this.authService.verifyTFA(this.tfaPassword);
    this.tfaPassword = '';
    if (verifyResponse && verifyResponse.err) {
      this.err = verifyResponse.err;
      return;
    } else if (verifyResponse.ok === true) {
      const disableResponse: any = await this.authService.disableTFA();
      this.isEnableTFA$ = this.TFAStatus();
      this.msg = disableResponse.msg;
    }
  }

  // Logout
  logout() {
    this.authService.logout();
  }
}