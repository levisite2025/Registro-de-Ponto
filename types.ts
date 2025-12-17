export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum LogType {
  ENTRY = 'ENTRY',
  LUNCH_START = 'LUNCH_START',
  LUNCH_END = 'LUNCH_END',
  EXIT = 'EXIT'
}

export interface CompanySettings {
  workStart: string; // e.g. "08:00"
  workEnd: string;   // e.g. "17:00"
  lunchStart: string; // e.g. "12:00"
  lunchEnd: string;   // e.g. "13:00"
  // EmailJS Configuration for Real Emails
  emailJsServiceId?: string;
  emailJsTemplateId?: string;
  emailJsPublicKey?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, never store plain text
  role: Role;
  position?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface TimeLog {
  id: string;
  userId: string;
  timestamp: string; // ISO string
  type: LogType;
  edited?: boolean;
  notes?: string;
  location?: GeoLocation;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}