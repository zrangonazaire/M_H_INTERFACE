import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface Department {
  id: number;
  code: string;
  nom: string;
  idEtablissement: number;
}

export interface DepartmentResponse {
  id: number;
  code: string;
  nom: string;
  idEtablissement: number;
  codeEtablissement: string;
  libelleEtablissement: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getDepartments(): Observable<DepartmentResponse[]> {
    return this.http
      .get<ApiResponse<{ data: DepartmentResponse[] }>>(`${this.baseUrl}/departments`)
      .pipe(map((response) => response.data.data));
  }

  getDepartmentById(id: number): Observable<DepartmentResponse> {
    return this.http
      .get<ApiResponse<{ department: DepartmentResponse }>>(`${this.baseUrl}/departments/${id}`)
      .pipe(map((response) => response.data.department));
  }

  createDepartment(department: Omit<Department, 'id'>): Observable<Department> {
    return this.http
      .post<ApiResponse<{ ServiceUnit: Department }>>(`${this.baseUrl}/departments/create`, {
        codeService: department.code,
        libelleService: department.nom,
        idEtablissement: department.idEtablissement
      })
      .pipe(map((response) => response.data.ServiceUnit));
  }

  updateDepartment(id: number, department: Partial<Department>): Observable<Department> {
    return this.http
      .put<ApiResponse<{ ServiceUnit: Department }>>(`${this.baseUrl}/departments/${id}`, {
        nom: department.nom,
        code: department.code
      })
      .pipe(map((response) => response.data.ServiceUnit));
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ ServiceUnit: Department }>>(`${this.baseUrl}/departments/${id}`)
      .pipe(map(() => {}));
  }

  getDepartmentsByEtablissement(idEtablissement: number): Observable<DepartmentResponse[]> {
    return this.http
      .get<ApiResponse<{ data: DepartmentResponse[] }>>(`${this.baseUrl}/departments/etablissement/${idEtablissement}`)
      .pipe(map((response) => response.data.data));
  }

  addUsersToDepartment(departmentId: number, userIds: number[]): Observable<Department> {
    return this.http
      .post<ApiResponse<{ ServiceUnit: Department }>>(`${this.baseUrl}/departments/${departmentId}/utilisateurs`, userIds)
      .pipe(map((response) => response.data.ServiceUnit));
  }

  removeUserFromDepartment(departmentId: number, userId: number): Observable<Department[]> {
    return this.http
      .delete<ApiResponse<{ ServiceUnit: Department[] }>>(`${this.baseUrl}/departments/${departmentId}/utilisateurs/${userId}`)
      .pipe(map((response) => response.data.ServiceUnit));
  }

  getUsersByDepartment(departmentId: number): Observable<any[]> {
    return this.http
      .get<ApiResponse<{ users: any[] }>>(`${this.baseUrl}/departments/${departmentId}/utilisateurs`)
      .pipe(map((response) => response.data.users));
  }
}