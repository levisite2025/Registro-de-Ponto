import { User } from '../types';
import { generateId, getSettings } from './storageService';
import { sendChromeNotification } from './chromeService';

export interface EmailNotification {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = 'pontocerto_notifications';

export const getNotifications = (): EmailNotification[] => {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Retorna Promise<boolean> para manter compatibilidade com UI (sempre true pois é interno)
export const sendEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
  const notifications = getNotifications();
  const id = generateId();
  const newEmail: EmailNotification = {
    id,
    to,
    subject,
    body,
    timestamp: new Date().toISOString(),
    read: false
  };
  
  // 1. Salva na notificação interna (Simulação do envio)
  notifications.unshift(newEmail);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  
  // Disparar notificação nativa (Chrome ou Web)
  sendChromeNotification(id, `Nova Mensagem: ${subject}`, body.substring(0, 80) + '...');
  
  console.log(`[SISTEMA INTERNO] Notificação salva para: ${to}`);

  // Simula um pequeno delay de rede para feedback visual na UI
  await new Promise(resolve => setTimeout(resolve, 500));

  return true; 
};

export const markAllAsRead = () => {
  const notifications = getNotifications().map(n => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

export const clearNotifications = () => {
  localStorage.removeItem(NOTIFICATIONS_KEY);
};

// Check for End of Day Reminder (Logic: If after 18:00, user has entry but no exit today)
export const checkEndOfDayReminder = (user: User, hasEntry: boolean, hasExit: boolean) => {
  const now = new Date();
  const todayKey = now.toDateString();
  const reminderKey = `reminder_${user.id}_${todayKey}`;
  
  // If already reminded today, skip
  if (localStorage.getItem(reminderKey)) return;

  // Logic: After 18:00 (6 PM), Entry exists, Exit missing
  if (now.getHours() >= 18 && hasEntry && !hasExit) {
    sendEmail(
      user.email, 
      "Lembrete: Registro de Saída Pendente", 
      `Olá ${user.name}, notamos que você registrou sua entrada hoje mas ainda não registrou sua saída. Por favor, regularize seu ponto.`
    );
    localStorage.setItem(reminderKey, 'true');
  }
};