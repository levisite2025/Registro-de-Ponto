// Abstração para APIs do Navegador (Chrome/Edge) com Fallback para Web
// Garante que o app funcione no Chrome, Edge e navegadores Web padrão

// Evita erros de linter/build se as variáveis globais não existirem
declare global {
  interface Window {
    chrome?: any;
    browser?: any;
  }
}

// Helper seguro para obter a API do navegador disponível
const getBrowserAPI = () => {
  try {
    if (typeof window !== 'undefined') {
      // Verifica namespaces globais de forma segura
      if ('browser' in window) return window.browser;
      if ('chrome' in window) return window.chrome;
    }
  } catch (e) {
    return null;
  }
  return null;
};

export const isExtension = (): boolean => {
  const api = getBrowserAPI();
  // Verificação defensiva: api deve existir e ter runtime.id
  // O uso de ?. previne crash se 'runtime' for undefined (comum em abas normais)
  return !!(api && api.runtime && api.runtime.id);
};

// Mantemos isChromeApp para compatibilidade com código existente
export const isChromeApp = isExtension;

// --- NOTIFICATIONS (Chrome & Edge) ---
export const sendChromeNotification = (id: string, title: string, message: string) => {
  try {
    const api = getBrowserAPI();
    if (isExtension() && api?.notifications) {
      api.notifications.create(id, {
        type: 'basic',
        iconUrl: 'logo192.png',
        title: title,
        message: message,
        priority: 2
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      // Web Fallback
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body: message });
          }
        });
      }
    }
  } catch (e) {
    console.warn("Notificações não suportadas neste ambiente.");
  }
};

// --- STORAGE (Sync Backup) ---
export const syncToChromeStorage = (key: string, data: any) => {
  try {
    const api = getBrowserAPI();
    if (isExtension() && api?.storage) {
      api.storage.local.set({ [key]: data }, () => {
        if (api.runtime?.lastError) {
          console.error("Erro ao salvar no Storage do Navegador:", api.runtime.lastError);
        }
      });
    }
  } catch (e) {
    // Ignora erros em ambiente web puro
  }
};

export const getFromChromeStorage = (key: string): Promise<any> => {
  return new Promise((resolve) => {
    try {
      const api = getBrowserAPI();
      if (isExtension() && api?.storage) {
        api.storage.local.get([key], (result: any) => {
          resolve(result[key] || null);
        });
      } else {
        resolve(null);
      }
    } catch (e) {
      resolve(null);
    }
  });
};

// --- IDENTITY ---
export const getChromeIdentity = (): Promise<{email?: string, id?: string} | null> => {
  return new Promise((resolve) => {
    try {
      const api = getBrowserAPI();
      if (isExtension() && api?.identity) {
        api.identity.getProfileUserInfo((userInfo: any) => {
          if (userInfo && userInfo.email) {
            resolve(userInfo);
          } else {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    } catch (e) {
      resolve(null);
    }
  });
};

// --- RUNTIME & LIFECYCLE ---
export const initRuntimeListeners = () => {
  try {
    const api = getBrowserAPI();
    
    // Suporte a Chrome Apps Legado
    if (api?.app?.runtime?.onLaunched) {
      api.app.runtime.onLaunched.addListener(() => {
         console.log("App iniciado via Runtime (Chrome App Legacy)");
      });
    }
    
    if (isExtension() && api?.runtime) {
      if (api.runtime.onInstalled) {
          api.runtime.onInstalled.addListener(() => {
          console.log("Extensão instalada/atualizada.");
          });
      }
    }
  } catch (e) {
    // Ignora erros de inicialização
  }
};

// --- NETWORK / SOCKETS STUB ---
export const initNetworkMonitor = () => {
  try {
    const api = getBrowserAPI();

    if (isExtension()) {
        // @ts-ignore
        if (api?.system?.network) {
            // @ts-ignore
            api.system.network.getNetworkInterfaces((interfaces) => {
                console.log("Interfaces de Rede detectadas (Extensão):", interfaces);
            });
        }
    }
    
    // Web Standard Fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => console.log('App Online (Web API)'));
      window.addEventListener('offline', () => console.log('App Offline (Web API)'));
    }
  } catch (e) {
    // Ignora erros de rede
  }
};