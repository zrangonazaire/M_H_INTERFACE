import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  dateOfBirth?: string;
  agence?: string;
  imageUrl?: string;
  accountLocked: boolean;
  enabled: boolean;
  roles: string[];
  createdDate?: string;
  lastModifiedDate?: string;
}

export interface RegistrationRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmationPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  // User Registration
  registerUser(request: RegistrationRequest): Observable<void> {
    return this.http
      .post<ApiResponse<{ user: User }>>(`${this.baseUrl}/auth/register`, request)
      .pipe(map(() => {}));
  }

  // Get all users (would need to be implemented in backend)
  getUsers(): Observable<User[]> {
    return this.http
      .get<ApiResponse<{ users: User[] }>>(`${this.baseUrl}/users`)
      .pipe(map((response) => response.data.users));
  }

  getUsersPaginated(page: number, size: number): Observable<{ users: User[], currentPage: number, totalItems: number, totalPages: number }> {
    return this.http.get<{ users: User[], currentPage: number, totalItems: number, totalPages: number }>(
      `${this.baseUrl}/users/paginated?page=${page}&size=${size}`
    );
  }

  // Get user by ID
  getUserById(id: number): Observable<User> {
    return this.http
      .get<ApiResponse<{ user: User }>>(`${this.baseUrl}/users/${id}`)
      .pipe(map((response) => response.data.user));
  }

  // Change password
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<{ user: User }>>(`${this.baseUrl}/auth/change-password`, request)
      .pipe(map(() => {}));
  }

  // Activate user account
  activateAccount(token: string): Observable<void> {
    return this.http
      .get<ApiResponse<{ user: User }>>(`${this.baseUrl}/auth/activate-account?token=${token}`)
      .pipe(map(() => {}));
  }

  // Lock/Unlock user account
  toggleAccountLock(userId: number, lock: boolean): Observable<User> {
    return this.http
      .put<ApiResponse<{ user: User }>>(`${this.baseUrl}/users/${userId}/lock`, { accountLocked: lock })
      .pipe(map((response) => response.data.user));
  }

  // Enable/Disable user account
  toggleAccountStatus(userId: number, enabled: boolean): Observable<User> {
    return this.http
      .put<ApiResponse<{ user: User }>>(`${this.baseUrl}/users/${userId}/status`, { enabled: enabled })
      .pipe(map((response) => response.data.user));
  }
   getIfRoleExiteByIdUser(idUser: number,idRole: number): Observable<boolean> {
    //http://localhost:8089/api/v1/users/11/roles/1/checkroleexist
    return this.http
      .get<boolean>(`${this.baseUrl}/users/${idUser}/roles/${idRole}/checkroleexist`);
      /* 
return this.http.get<boolean>(
      `${this.API_URL}/${idUser}/roles/${idRole}/checkroleexist` */
  }
}
