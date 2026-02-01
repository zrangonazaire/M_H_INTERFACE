export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegistrationRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  pdvFne?: string;
  etablisssementFne?: string;
}

export interface UserDTO {
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
  pdvFne?: string;
  etablisssementFne?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmationPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthenticationResponse {
  token: string;
}
