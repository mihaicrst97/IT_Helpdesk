import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface CertificationSummary {
  id: string;
  name: string;
  certifiedAt: Date;
}

export interface SafeUserResponse {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: Date;
  certifications: CertificationSummary[];
}

export interface AuthResult {
  token: string;
  user: SafeUserResponse;
}
