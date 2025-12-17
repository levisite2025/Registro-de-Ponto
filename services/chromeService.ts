// Abstração para APIs do Navegador (Chrome/Edge) com Fallback para Web
// Garante que o app funcione no Chrome, Edge e navegadores Web padrão

declare var chrome: any;
declare var browser: any; // Namespace padrão WebExtensions usado também pelo Edge/Firefox

// Helper para obter a API do navegador disponível
const getBrowserAPI = () => {
  if (typeof browser !== 'undefined') {
    return browser;
  }
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  return null;
};

export const isExtension = (): boolean => {
  const api = getBrowserAPI();
  return !!(api && api.runtime && api.runtime.id);
};

// Mantemos isChromeApp para compatibilidade com código existente, mas usando a nova detecção
export const isChromeApp = isExtension;

// --- NOTIFICATIONS (Chrome & Edge) ---
export const sendChromeNotification = (id: string, title: string, message: string) => {
  const api = getBrowserAPI();
  if (isExtension() && api.notifications) {
    api.notifications.create(id, {
      type: 'basic',
      iconUrl: 'logo192.png', // Placeholder icon
      title: title,
      message: message,
      priority: 2
    });
  } else if ('Notification' in window) {
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
};

// --- STORAGE (Sync Backup) ---
// Funciona com chrome.storage ou browser.storage
export const syncToChromeStorage = (key: string, data: any) => {
  const api = getBrowserAPI();
  if (isExtension() && api.storage) {
    api.storage.local.set({ [key]: data }, () => {
      // Chrome usa callback, Browser usa Promise, mas Chrome também aceita callback no Edge
      if (api.runtime.lastError) {
        console.error("Erro ao salvar no Storage do Navegador:", api.runtime.lastError);
      }
    });
  }
};

export const getFromChromeStorage = (key: string): Promise<any> => {
  return new Promise((resolve) => {
    const api = getBrowserAPI();
    if (isExtension() && api.storage) {
      api.storage.local.get([key], (result: any) => {
        resolve(result[key] || null);
      });
    } else {
      resolve(null);
    }
  });
};

// --- IDENTITY ---
export const getChromeIdentity = (): Promise<{email?: string, id?: string} | null> => {
  return new Promise((resolve) => {
    const api = getBrowserAPI();
    if (isExtension() && api.identity) {
      // Edge e Chrome suportam getProfileUserInfo
      api.identity.getProfileUserInfo((userInfo: any) => {
        if (userInfo && userInfo.email) {
          resolve(userInfo);
        } else {
          // Fallback ou tentativa de auth interativa
          // Nota: No Edge, isso pode exigir configuração específica no manifesto e loja
          api.identity.getAuthToken({ interactive: true }, (token: string) => {
             if (api.runtime.lastError || !token) {
               resolve(null);
               return;
             }
             resolve({ email: 'usuario_autenticado@extension' }); 
          });
        }
      });
    } else {
      resolve(null);
    }
  });
};

// --- RUNTIME & LIFECYCLE ---
export const initRuntimeListeners = () => {
  const api = getBrowserAPI();
  
  // Suporte a Chrome Apps Legado (apenas se existir a API específica)
  if (api && api.app && api.app.runtime && api.app.runtime.onLaunched) {
    api.app.runtime.onLaunched.addListener(() => {
       console.log("App iniciado via Runtime (Chrome App Legacy)");
    });
  }
  
  if (isExtension() && api.runtime) {
    // Listeners genéricos de extensão (Chrome + Edge)
    if (api.runtime.onInstalled) {
        api.runtime.onInstalled.addListener(() => {
        console.log("Extensão instalada/atualizada no navegador.");
        });
    }
    
    if (api.runtime.onSuspend) {
        api.runtime.onSuspend.addListener(() => {
        console.log("Extensão sendo suspensa.");
        });
    }
  }
};

// --- NETWORK / SOCKETS STUB ---
export const initNetworkMonitor = () => {
  const api = getBrowserAPI();

  if (isExtension()) {
      // APIs de sistema (chrome.system.*) são mais comuns em Chrome OS ou Apps, 
      // mas verificamos a existência antes de usar para evitar erros no Edge.
      
      // @ts-ignore
      if (api.system && api.system.network) {
          // @ts-ignore
          api.system.network.getNetworkInterfaces((interfaces) => {
              console.log("Interfaces de Rede detectadas (Extensão):", interfaces);
          });
      }
      
      // Stub para Sockets TCP
      // @ts-ignore
      if (api.sockets && api.sockets.tcp) {
        console.log("API de Sockets TCP disponível.");
      }
  }
  
  // Web Standard Fallback
  window.addEventListener('online', () => console.log('App Online (Web API)'));
  window.addEventListener('offline', () => console.log('App Offline (Web API)'));
};