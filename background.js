// Background Service Worker para PontoCerto
// Compatível com Chrome e Edge (Manifest V3)

// Detectar namespace (chrome ou browser)
const api = typeof browser !== 'undefined' ? browser : chrome;

api.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('PontoCerto instalado com sucesso.');
    
    // Configurações iniciais podem ser definidas aqui se necessário
    // Exemplo: Limpar storage antigo ou definir alarmes padrão
  } else if (details.reason === 'update') {
    console.log('PontoCerto atualizado para nova versão.');
  }
});

// Listener para alarmes (se utilizados futuramente para lembretes automáticos em background)
api.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarme disparado:', alarm.name);
  // Lógica de notificação background poderia vir aqui
});
