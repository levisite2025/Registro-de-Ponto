import { User, TimeLog, Role, LogType, CompanySettings } from '../types';
import { syncToChromeStorage, getFromChromeStorage } from './chromeService';

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
// Try to sync from Chrome storage if local storage is empty
export const initStorage = async () => {
  let usersStr = localStorage.getItem(USERS_KEY);
  
  // ESTRATÉGIA ROBUSTA: Garantir que o admin exista no LocalStorage IMEDIATAMENTE.
  if (!usersStr) {
    const adminUser: User = {
      id: '1',
      name: 'Administrador',
      email: 'admin@empresa.com', // Login do Admin via Email
      password: 'admin',          // Senha padrão do Admin
      role: Role.ADMIN,
      position: 'Gerente Geral'
    };
    const initialUsers = [adminUser];
    
    // Salva imediatamente no síncrono
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    
    // Tenta recuperar backup do Chrome depois
    getFromChromeStorage(USERS_KEY).then((chromeUsers) => {
        if (chromeUsers && Array.isArray(chromeUsers) && chromeUsers.length > 0) {
             console.log("Dados recuperados do Chrome Storage.");
             localStorage.setItem(USERS_KEY, JSON.stringify(chromeUsers));
        } else {
             syncToChromeStorage(USERS_KEY, initialUsers);
        }
    });
  } else {
      try {
        const currentUsers = JSON.parse(usersStr);
        syncToChromeStorage(USERS_KEY, currentUsers);
      } catch (e) { console.error("Erro ao fazer backup silencioso users", e); }
  }
  
  // Sync Logs logic
  if (!localStorage.getItem(LOGS_KEY)) {
      getFromChromeStorage(LOGS_KEY).then((chromeLogs) => {
          if (chromeLogs) {
              localStorage.setItem(LOGS_KEY, JSON.stringify(chromeLogs));
          }
      });
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
  // Backup to Chrome Storage
  syncToChromeStorage(USERS_KEY, users);
};

export const deleteUser = (userId: string): void => {
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  syncToChromeStorage(USERS_KEY, users);
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
  syncToChromeStorage(LOGS_KEY, logs);
};

export const getUserLogs = (userId: string): TimeLog[] => {
  return getLogs().filter(log => log.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const deleteLog = (logId: string): void => {
  const logs = getLogs().filter(l => l.id !== logId);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  syncToChromeStorage(LOGS_KEY, logs);
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
  syncToChromeStorage(SETTINGS_KEY, settings);
};