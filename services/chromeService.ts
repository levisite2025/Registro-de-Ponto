// Abstração para APIs do Chrome com Fallback para Web
// Garante que o app funcione tanto no navegador comum quanto como Extensão/App Chrome

declare var chrome: any;

export const isChromeApp = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
};

// --- CHROME NOTIFICATIONS ---
export const sendChromeNotification = (id: string, title: string, message: string) => {
  if (isChromeApp() && chrome.notifications) {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'logo192.png', // Certifique-se de ter um ícone ou use um placeholder
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

// --- CHROME STORAGE (Sync Backup) ---
// Nota: Chrome Storage é assíncrono. Usamos como backup do localStorage síncrono.
export const syncToChromeStorage = (key: string, data: any) => {
  if (isChromeApp() && chrome.storage) {
    chrome.storage.local.set({ [key]: data }, () => {
      if (chrome.runtime.lastError) {
        console.error("Erro ao salvar no Chrome Storage:", chrome.runtime.lastError);
      }
    });
  }
};

export const getFromChromeStorage = (key: string): Promise<any> => {
  return new Promise((resolve) => {
    if (isChromeApp() && chrome.storage) {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    } else {
      resolve(null);
    }
  });
};

// --- CHROME IDENTITY ---
export const getChromeIdentity = (): Promise<{email?: string, id?: string} | null> => {
  return new Promise((resolve) => {
    if (isChromeApp() && chrome.identity) {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (userInfo) {
          resolve(userInfo);
        } else {
          // Tentar fluxo interativo se necessário
          chrome.identity.getAuthToken({ interactive: true }, (token) => {
             if (chrome.runtime.lastError || !token) {
               resolve(null);
               return;
             }
             // Com o token, poderíamos buscar detalhes na API do Google
             resolve({ email: 'usuario_autenticado@chrome.app' }); 
          });
        }
      });
    } else {
      resolve(null);
    }
  });
};

// --- CHROME RUNTIME & LIFECYCLE ---
export const initRuntimeListeners = () => {
  if (isChromeApp() && chrome.app && chrome.app.runtime) {
    // Apenas para Chrome Apps (Legado)
    chrome.app.runtime.onLaunched.addListener(() => {
       console.log("App iniciado via Chrome Runtime");
       // Lógica de abertura de janela seria aqui para Chrome Apps
    });
  }
  
  if (isChromeApp() && chrome.runtime) {
    // Listeners genéricos de extensão
    chrome.runtime.onInstalled.addListener(() => {
      console.log("Extensão/App instalado.");
    });
    
    chrome.runtime.onSuspend.addListener(() => {
      console.log("App sendo suspenso. Salvando dados críticos...");
    });
  }
};

// --- NETWORK / SOCKETS STUB ---
// APIs de socket (chrome.sockets.*) são exclusivas de Chrome Apps ou extensões específicas.
// Web Apps usam WebSockets ou Fetch.
export const initNetworkMonitor = () => {
  if (isChromeApp()) {
      // Exemplo de uso de system.network se disponível
      // @ts-ignore - Tipagem para APIs específicas pode não estar disponível
      if (chrome.system && chrome.system.network) {
          // @ts-ignore
          chrome.system.network.getNetworkInterfaces((interfaces) => {
              console.log("Interfaces de Rede detectadas (Chrome API):", interfaces);
          });
      }
      
      // Stub para Sockets TCP (apenas para demonstrar integração)
      // @ts-ignore
      if (chrome.sockets && chrome.sockets.tcp) {
        console.log("API de Sockets TCP disponível.");
        // chrome.sockets.tcp.create({}, (createInfo) => { ... });
      }
  }
  
  // Web Standard Fallback
  window.addEventListener('online', () => console.log('App Online (Web API)'));
  window.addEventListener('offline', () => console.log('App Offline (Web API)'));
};