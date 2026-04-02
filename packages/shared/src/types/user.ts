export enum ProfileType {
  HOMEOWNER = 'HOMEOWNER',
  ARCHITECT_INDIVIDUAL = 'ARCHITECT_INDIVIDUAL',
  ARCHITECT_ORG = 'ARCHITECT_ORG',
}

export enum PlatformRole {
  FREE_USER = 'FREE_USER',
  PRO_USER = 'PRO_USER',
  ARCHITECT = 'ARCHITECT',
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_MEMBER = 'ORG_MEMBER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  profileType: ProfileType;
  platformRole: PlatformRole;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  profileType: ProfileType;
}

export interface LoginRequest {
  email: string;
  password: string;
}
