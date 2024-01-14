import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable, lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AwsService {

  constructor(private http: HttpClient, private authService: AuthService) { } 

  fetchS3Object(): Observable<Blob> {
    return this.http.get<Blob>(`${environment.BACK_URL}/avatar/fetch`, { headers: this.authService.getHeader(), responseType: 'blob' as 'json' });
  }
 
  fetchAvatarById(id: number): Observable<Blob> {
    return this.http.get<Blob>(`${environment.BACK_URL}/avatar/fetchbyid/${id}`, { headers: this.authService.getHeader(), responseType: 'blob' as 'json' });
  }

  async getAvatarUrl(id: number): Promise<string> {
    let url = '../../../assets/default.jpg';
    try {
      const response = await lastValueFrom(this.fetchAvatarById(id));
  
      if (response instanceof Blob) {
        url = URL.createObjectURL(response);
      }
    } catch (error) {
      console.log(error);
    }
    return url;
  }

  deleteS3Object(): Observable<any> {
    return this.http.delete(`${environment.BACK_URL}/avatar/delete`, { headers: this.authService.getHeader() });
  }
}
