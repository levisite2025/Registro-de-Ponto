import { User } from '../types';
import { generateId, getSettings } from './storageService';
import { sendChromeNotification } from './chromeService';
import emailjs from '@emailjs/browser';

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

export const sendEmail = (to: string, subject: string, body: string) => {
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
  
  // 1. Salva na notificação interna (Fallback sempre garantido)
  notifications.unshift(newEmail);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  
  // Disparar notificação nativa (Chrome ou Web)
  sendChromeNotification(id, `Nova Mensagem: ${subject}`, body.substring(0, 80) + '...');
  
  console.log(`[SISTEMA INTERNO] Notificação salva para: ${to}`);

  // 2. Tenta enviar E-mail Real via EmailJS (Se configurado)
  const settings = getSettings();
  
  if (settings.emailJsServiceId && settings.emailJsTemplateId && settings.emailJsPublicKey) {
      console.log("Tentando enviar e-mail real via EmailJS...");
      
      const templateParams = {
          to_email: to,
          subject: subject,
          message: body
      };

      emailjs.send(
          settings.emailJsServiceId,
          settings.emailJsTemplateId,
          templateParams,
          settings.emailJsPublicKey
      )
      .then((response) => {
         console.log('EMAIL REAL ENVIADO COM SUCESSO!', response.status, response.text);
      })
      .catch((err) => {
         console.error('FALHA AO ENVIAR EMAIL REAL:', err);
         // Não alertamos o usuário final para não interromper o fluxo, mas o admin pode ver no console
      });
  } else {
      console.warn("EmailJS não configurado. O e-mail real não foi enviado (apenas notificação interna). Configure nas opções de Administrador.");
  }
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