import { User, TimeLog, Role, LogType, CompanySettings } from '../types';

const USERS_KEY = 'pontocerto_users';
const LOGS_KEY = 'pontocerto_logs';
const SETTINGS_KEY = 'pontocerto_settings';

// Helper for ID generation compatible with all contexts (HTTP/HTTPS)
export const generateId = (): string => {
  // Try native crypto if secure context
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if crypto.randomUUID fails (e.g. insecure context in Chrome)
    }
  }
  // Robust Fallback
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Initialize with default admin if empty
export const initStorage = () => {
  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    const adminUser: User = {
      id: '1',
      name: 'Administrador',
      email: 'admin@empresa.com',
      password: 'admin',
      role: Role.ADMIN,
      position: 'Gerente'
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([adminUser]));
  }
};

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const deleteUser = (userId: string): void => {
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getLogs = (): TimeLog[] => {
  const stored = localStorage.getItem(LOGS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLog = (log: TimeLog): void => {
  const logs = getLogs();
  const existingIndex = logs.findIndex(l => l.id === log.id);
  
  if (existingIndex >= 0) {
    logs[existingIndex] = log;
  } else {
    logs.push(log);
  }
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

export const getUserLogs = (userId: string): TimeLog[] => {
  return getLogs().filter(log => log.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const deleteLog = (logId: string): void => {
  const logs = getLogs().filter(l => l.id !== logId);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

export const getSettings = (): CompanySettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) return JSON.parse(stored);
  
  // Default settings if none exist
  return {
    workStart: "08:00",
    workEnd: "17:00",
    lunchStart: "12:00",
    lunchEnd: "13:00"
  };
};

export const saveSettings = (settings: CompanySettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};