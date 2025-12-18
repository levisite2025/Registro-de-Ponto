import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react';
import { AuthState, User, Role, TimeLog, LogType, CompanySettings, GeoLocation } from './types';
import { initStorage, getUsers, getLogs, saveLog, saveUser, deleteUser, getUserLogs, deleteLog, getSettings, saveSettings, generateId, getAllData, importData } from './services/storageService';
import { generateMonthlyReportAnalysis } from './services/geminiService';
import { sendEmail, getNotifications, markAllAsRead, checkEndOfDayReminder, EmailNotification, clearNotifications } from './services/notificationService';
import { generateEmployeePDF } from './services/pdfService';
import { initRuntimeListeners, initNetworkMonitor, getChromeIdentity } from './services/chromeService';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';

// --- CONFIGURAÇÃO DA LOGO ---
const COMPANY_LOGO = "https://placehold.co/300x100/ffffff/004aad/png?text=Espaco+Hidro&font=roboto"; 

// --- ICONS (SVG) ---
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const LogOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const CoffeeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const AlertCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const WifiOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// --- TOAST CONTEXT ---
interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const ToastContext = createContext<{ showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }>({ showToast: () => {} });

const useToast = () => useContext(ToastContext);

const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center p-4 rounded-lg shadow-lg border animate-slide-in ${
            toast.type === 'success' ? 'bg-white text-emerald-700 border-emerald-100 dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-900/50' :
            toast.type === 'error' ? 'bg-white text-red-700 border-red-100 dark:bg-slate-800 dark:text-red-400 dark:border-red-900/50' :
            'bg-white text-blue-700 border-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-900/50'
          }`}>
             <div className="mr-3">
               {toast.type === 'success' ? <CheckIcon /> : toast.type === 'error' ? <AlertCircleIcon /> : <BellIcon />}
             </div>
             <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// --- HELPER COMPONENTS ---

const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="bg-red-500 text-white text-xs font-bold text-center py-1 absolute top-0 w-full z-50 flex items-center justify-center gap-2">
            <WifiOffIcon /> Modo Offline - Verifique sua conexão
        </div>
    );
};

const Login: React.FC<{ onLogin: (u: User) => void }> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState(''); 
  const [credential, setCredential] = useState(''); 
  const { showToast } = useToast();
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    getChromeIdentity().then(info => {
      if (info && info.email) setIdentifier(info.email);
    });
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getUsers();
    const inputId = identifier.trim();
    const inputCred = credential.trim();
    
    // 1. Admin
    const adminUser = users.find(u => 
        u.role === Role.ADMIN && 
        u.email.toLowerCase() === inputId.toLowerCase() &&
        u.password === inputCred
    );

    if (adminUser) {
        onLogin(adminUser);
        return;
    }

    // 2. Employee
    const employeeUser = users.find(u => {
        if (u.role === Role.ADMIN) return false;
        const uFirstName = u.name.split(' ')[0].toLowerCase();
        return uFirstName === inputId.toLowerCase() && u.password === inputCred;
    });

    if (employeeUser) {
        onLogin(employeeUser);
        return;
    }

    showToast('Credenciais inválidas. Verifique seus dados.', 'error');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-teal-800 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 transition-colors duration-300 animate-fade-in">
        
        <div className="md:w-1/2 bg-slate-50 dark:bg-slate-800/50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 relative">
            <div className="mb-6 p-6 bg-white dark:bg-slate-700 rounded-full shadow-lg">
                <img 
                    src={COMPANY_LOGO} 
                    alt="Espaço Hidro" 
                    className="h-16 w-auto object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </div>
            
            <div className="flex flex-col items-center mb-6">
                <div className="text-5xl font-mono font-bold text-slate-700 dark:text-white tracking-widest drop-shadow-sm">
                    {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-sm text-brand-600 dark:text-brand-400 font-medium uppercase tracking-wide mt-2">
                    {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>

            <h1 className="text-3xl font-extrabold text-brand-900 dark:text-brand-400 mb-2">PontoCerto</h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm px-8">Sistema inteligente de gestão de ponto.</p>
        </div>

        <div className="md:w-1/2 p-8 md:p-12">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center md:text-left">Identifique-se</h2>
            
            <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Funcionário (Nome) / Admin (Email)
                </label>
                <input 
                type="text" 
                required 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                placeholder="Ex: Maria ou admin@empresa.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Código (Func) / Senha (Admin)
                </label>
                <input 
                type="password" 
                required 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-mono text-center tracking-widest text-lg"
                placeholder="••••"
                value={credential}
                onChange={e => setCredential(e.target.value)}
                />
            </div>
            <Button type="submit" className="w-full py-3 text-lg shadow-lg shadow-blue-500/30">Entrar</Button>
            </form>
            
            <div className="mt-8 text-center space-y-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                Admin Padrão: admin@empresa.com / admin
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

const LogBadge: React.FC<{ type: LogType }> = ({ type }) => {
  const styles = {
    [LogType.ENTRY]: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    [LogType.LUNCH_START]: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    [LogType.LUNCH_END]: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    [LogType.EXIT]: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  };
  const icons = {
    [LogType.ENTRY]: "→",
    [LogType.LUNCH_START]: "☕",
    [LogType.LUNCH_END]: "↩",
    [LogType.EXIT]: "←",
  };
  const labels = {
    [LogType.ENTRY]: "Entrada",
    [LogType.LUNCH_START]: "Saída Almoço",
    [LogType.LUNCH_END]: "Volta Almoço",
    [LogType.EXIT]: "Saída",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${styles[type]}`}>
      <span className="mr-1.5 opacity-70">{icons[type]}</span>
      {labels[type]}
    </span>
  );
};

// Helper to calculate time deviation
const getTimeDeviation = (log: TimeLog, settings: CompanySettings) => {
    const logDate = new Date(log.timestamp);
    const logMinutes = logDate.getHours() * 60 + logDate.getMinutes();

    const getSettingMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    if (log.type === LogType.ENTRY) {
        const startMinutes = getSettingMinutes(settings.workStart);
        // Tolerance of 5 minutes
        const diff = logMinutes - startMinutes;
        if (diff > 5) return { status: 'late', diff, label: `+${diff}m` };
    }

    if (log.type === LogType.EXIT) {
        const endMinutes = getSettingMinutes(settings.workEnd);
        const diff = endMinutes - logMinutes;
        if (diff > 5) return { status: 'early', diff, label: `-${diff}m` };
    }

    return null;
};


// --- DASHBOARDS ---

const EmployeeDashboard: React.FC<{ user: User, currentUserRole: Role, isDark: boolean, onLogout?: () => void }> = ({ user, currentUserRole, isDark, onLogout }) => {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showToast } = useToast();
  
  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [pendingLogType, setPendingLogType] = useState<LogType | null>(null);
  const [logNotes, setLogNotes] = useState('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [settings, setSettings] = useState<CompanySettings>(getSettings());
  
  // Filtering state
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Reporting state
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setLogs(getUserLogs(user.id));
    setSettings(getSettings());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user.id]);

  useEffect(() => {
    if (currentUserRole === Role.EMPLOYEE) {
        const today = new Date().toLocaleDateString();
        const todaysLogs = logs.filter(l => new Date(l.timestamp).toLocaleDateString() === today);
        const hasEntry = todaysLogs.some(l => l.type === LogType.ENTRY);
        const hasExit = todaysLogs.some(l => l.type === LogType.EXIT);
        checkEndOfDayReminder(user, hasEntry, hasExit);
    }
  }, [logs, user, currentUserRole]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
        const logDate = new Date(log.timestamp);
        const logDateStr = log.timestamp.split('T')[0];
        
        if (filterStartDate && logDateStr < filterStartDate) return false;
        if (filterEndDate && logDateStr > filterEndDate) return false;
        if (filterType !== 'ALL' && log.type !== filterType) return false;
        
        return true;
    });
  }, [logs, filterStartDate, filterEndDate, filterType]);

  const isWorkDayFinished = useMemo(() => {
      const today = new Date().toLocaleDateString('pt-BR');
      return logs.some(l => 
          l.type === LogType.EXIT && 
          new Date(l.timestamp).toLocaleDateString('pt-BR') === today
      );
  }, [logs]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterType('ALL');
  };

  const initiateRegister = (type: LogType) => {
    setPendingLogType(type);
    setLogNotes('');
    setIsRegisterModalOpen(true);
  };

  // Improved Geolocation to not block execution
  const getLocation = (): Promise<GeoLocation | undefined> => {
      return new Promise((resolve) => {
          if (!navigator.geolocation) {
              resolve(undefined);
              return;
          }
          // Timeout of 7 seconds for location
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  resolve({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude
                  });
              },
              (error) => {
                  console.warn("Geolocalização falhou (timeout ou permissão):", error);
                  resolve(undefined);
              },
              { timeout: 7000, enableHighAccuracy: true }
          );
      });
  };

  const finalizeRegister = async () => {
    if (!pendingLogType) return;
    
    setIsLocationLoading(true);

    try {
        const now = new Date();
        const location = await getLocation();

        if (!location) {
            showToast("Atenção: Localização não detectada. Ponto será registrado sem GPS.", 'error');
        }

        const newLog: TimeLog = {
            id: generateId(),
            userId: user.id,
            timestamp: now.toISOString(),
            type: pendingLogType,
            notes: logNotes.trim() || undefined,
            location: location
        };
        
        saveLog(newLog);
        
        const typeLabels: Record<string, string> = {
            [LogType.ENTRY]: "Entrada",
            [LogType.LUNCH_START]: "Início de Intervalo",
            [LogType.LUNCH_END]: "Fim de Intervalo",
            [LogType.EXIT]: "Saída"
        };
        const typeLabel = typeLabels[pendingLogType] || pendingLogType;

        let locationInfo = "Localização: Não disponível";
        let mapsLink = "";
        
        if (location) {
            mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
            locationInfo = `Localização: ${location.latitude}, ${location.longitude}\nLink Mapa: ${mapsLink}`;
        }

        const receiptSubject = `Comprovante de Ponto: ${typeLabel} - ${now.toLocaleDateString()}`;
        const receiptBody = `
COMPROVANTE DE REGISTRO DE PONTO
--------------------------------
Colaborador: ${user.name}
Data: ${now.toLocaleDateString()}
Horário: ${now.toLocaleTimeString()}
Tipo de Registro: ${typeLabel}
ID do Registro: ${newLog.id}
${logNotes ? `Observação: ${logNotes}` : ''}

${locationInfo}
--------------------------------
Este é um comprovante digital gerado automaticamente pelo sistema PontoCerto.
        `.trim();

        // Send Email (Non-blocking promise, but we wait for UI feedback if wanted, here we just fire)
        sendEmail(user.email, receiptSubject, receiptBody).then(sent => {
            if(!sent) console.log("E-mail real falhou, apenas interno salvo.");
        });

        setLogs(getUserLogs(user.id));
        setIsRegisterModalOpen(false);
        showToast(`Registro de ${typeLabel} realizado com sucesso!`, 'success');
        
        if (pendingLogType === LogType.EXIT && onLogout) {
            setTimeout(() => {
                onLogout();
            }, 1500);
        }
    } catch (e) {
        console.error("Erro ao salvar log", e);
        showToast("Ocorreu um erro ao salvar o ponto. Tente novamente.", 'error');
    } finally {
        setIsLocationLoading(false);
        setPendingLogType(null);
    }
  };

  const handleEdit = (log: TimeLog) => {
    const d = new Date(log.timestamp);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().substring(0, 5);
    
    setEditDate(dateStr);
    setEditTime(timeStr);
    setIsEditing(log.id);
  };

  const saveEdit = async () => {
    if (!isEditing) return;
    const logToEdit = logs.find(l => l.id === isEditing);
    if (!logToEdit) return;

    const oldDate = new Date(logToEdit.timestamp);
    const newTimestamp = new Date(`${editDate}T${editTime}`).toISOString();
    const updatedLog = { ...logToEdit, timestamp: newTimestamp, edited: true };
    saveLog(updatedLog);
    
    let subject = "";
    let body = "";

    if (currentUserRole === Role.EMPLOYEE) {
        subject = `Solicitação de Correção: ${user.name}`;
        body = `O funcionário ${user.name} solicitou/realizou uma correção no registro de ${oldDate.toLocaleString()} para ${new Date(newTimestamp).toLocaleString()}.`;
        // Send to admin
        await sendEmail("admin@empresa.com", subject, body);
        showToast("Solicitação de correção enviada.", 'success');
    } else {
        subject = "Correção de Ponto Aprovada/Realizada";
        body = `Uma correção foi realizada em seu registro de ponto pelo Administrador. Novo horário: ${new Date(newTimestamp).toLocaleString()}.`;
        await sendEmail(user.email, subject, body);
        showToast("Registro corrigido com sucesso.", 'success');
    }

    setLogs(getUserLogs(user.id));
    setIsEditing(null);
  };

  const handleAnalysis = async () => {
    setAnalyzing(true);
    const monthName = currentTime.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const currentSettings = getSettings();
    const result = await generateMonthlyReportAnalysis(user, logs, currentSettings, monthName);
    setAnalysis(result || "Sem dados.");
    setAnalyzing(false);
  };

  const chartData = React.useMemo(() => {
    const data: Record<string, number> = {};
    logs.forEach(l => {
        const day = new Date(l.timestamp).toLocaleDateString('pt-BR', {day: '2-digit'});
        data[day] = (data[day] || 0) + 1;
    });
    return Object.entries(data).map(([day, count]) => ({ day, registros: count })).reverse().slice(0, 7);
  }, [logs]);

  const lastLog = logs.length > 0 ? logs[0] : null;
  const lastType = lastLog ? lastLog.type : LogType.EXIT;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      {currentUserRole === Role.EMPLOYEE && (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-700 to-teal-700 shadow-xl text-white p-6 sm:p-10 transition-all duration-500 hover:shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
                <p className="text-brand-100 font-medium text-lg mb-1">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <div className="text-6xl sm:text-7xl font-bold font-mono tracking-tight text-white drop-shadow-sm">
                    {currentTime.toLocaleTimeString('pt-BR')}
                </div>
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-brand-50">
                    <span className="w-2 h-2 rounded-full bg-teal-400 mr-2 animate-pulse"></span>
                    Turno: {settings.workStart} - {settings.workEnd}
                </div>
            </div>

            {isWorkDayFinished ? (
                 <div className="w-full max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center shadow-lg">
                    <div className="flex justify-center mb-2 text-brand-100">
                        <LogOutIcon />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Expediente Finalizado</h3>
                    <p className="text-brand-100 text-sm">Você já registrou sua saída hoje. Bom descanso!</p>
                 </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                    <button 
                        onClick={() => initiateRegister(LogType.ENTRY)} 
                        disabled={lastType === LogType.ENTRY || lastType === LogType.LUNCH_START || lastType === LogType.LUNCH_END}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all disabled:opacity-30 disabled:hover:bg-white/10 group"
                    >
                        <div className="bg-emerald-500/20 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform"><SunIcon /></div>
                        <span className="font-semibold text-sm">Entrada</span>
                    </button>

                    <button 
                        onClick={() => initiateRegister(LogType.LUNCH_START)} 
                        disabled={lastType !== LogType.ENTRY}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all disabled:opacity-30 disabled:hover:bg-white/10 group"
                    >
                        <div className="bg-amber-500/20 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform"><CoffeeIcon /></div>
                        <span className="font-semibold text-sm">Sair Almoço</span>
                    </button>

                    <button 
                        onClick={() => initiateRegister(LogType.LUNCH_END)} 
                        disabled={lastType !== LogType.LUNCH_START}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all disabled:opacity-30 disabled:hover:bg-white/10 group"
                    >
                        <div className="bg-indigo-500/20 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform"><CoffeeIcon /></div>
                        <span className="font-semibold text-sm">Voltar Almoço</span>
                    </button>

                    <button 
                        onClick={() => initiateRegister(LogType.EXIT)} 
                        disabled={lastType === LogType.EXIT || lastType === LogType.LUNCH_START}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all disabled:opacity-30 disabled:hover:bg-white/10 group"
                    >
                        <div className="bg-rose-500/20 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform"><LogOutIcon /></div>
                        <span className="font-semibold text-sm">Saída</span>
                    </button>
                </div>
            )}
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            {/* Filter Section */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center text-slate-700 dark:text-slate-200 font-bold mb-4">
                    <FilterIcon /> <span className="ml-2">Filtrar Registros</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mb-1">De</label>
                        <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none dark:text-slate-200" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mb-1">Até</label>
                        <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none dark:text-slate-200" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mb-1">Tipo</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 text-sm focus:ring-brand-500 focus:border-brand-500 outline-none dark:text-slate-200">
                            <option value="ALL">Todos</option>
                            <option value={LogType.ENTRY}>Entrada</option>
                            <option value={LogType.LUNCH_START}>Sair Almoço</option>
                            <option value={LogType.LUNCH_END}>Voltar Almoço</option>
                            <option value={LogType.EXIT}>Saída</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={clearFilters} variant="secondary" className="w-full text-sm">Limpar</Button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Histórico ({filteredLogs.length})</h3>
                    <Button variant="outline" onClick={handleAnalysis} isLoading={analyzing} className="text-sm w-full sm:w-auto hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:hover:bg-slate-700 dark:hover:text-brand-400" title="Gerar análise com IA">
                    <SparklesIcon /> <span className="ml-2">Analisar com IA</span>
                    </Button>
                </div>
            
            {/* Desktop Table View */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                    <th className="p-4 rounded-tl-lg">Data</th>
                    <th className="p-4">Hora</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right rounded-tr-lg">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredLogs.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                    ) : filteredLogs.map(log => {
                        const deviation = getTimeDeviation(log, settings);
                        return (
                        <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${deviation ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                            <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">{new Date(log.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                    {deviation && (
                                        <div className="flex items-center text-xs text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full animate-pulse">
                                            <div className="scale-75 mr-0.5"><AlertCircleIcon /></div>
                                            {deviation.label}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="p-4"><LogBadge type={log.type} /></td>
                            <td className="p-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                {log.edited && <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full font-medium border border-amber-100 dark:border-amber-900/30">Corrigido</span>}
                                {deviation && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold border ${deviation.status === 'late' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                                        {deviation.status === 'late' ? 'Atraso' : 'Saída Antecipada'}
                                    </span>
                                )}
                                {!log.edited && !deviation && <span className="text-xs text-slate-400">-</span>}
                                {log.location && (
                                    <a 
                                        href={`https://www.google.com/maps?q=${log.location.latitude},${log.location.longitude}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-brand-500 hover:text-brand-700 transition-colors transform hover:scale-110" 
                                        title={`Coordenadas: ${log.location.latitude}, ${log.location.longitude}\nClique para ver no mapa.`}
                                    >
                                        <MapPinIcon />
                                    </a>
                                )}
                                {log.notes && (
                                    <div className="text-slate-400 hover:text-brand-500 cursor-help transition-colors" title={`Observação: ${log.notes}`}>
                                        <FileTextIcon />
                                    </div>
                                )}
                                </div>
                            </td>
                            <td className="p-4 text-right">
                            <button onClick={() => handleEdit(log)} className="text-slate-400 hover:text-brand-600 p-2 hover:bg-brand-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Corrigir Registro">
                                <EditIcon />
                            </button>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>
            </div>

            {/* Mobile Cards for History (Integrated click logic) */}
            <div className="block sm:hidden space-y-4">
                {filteredLogs.map(log => {
                     const deviation = getTimeDeviation(log, settings);
                     return (
                         <div key={log.id} className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center ${deviation ? 'ring-2 ring-amber-100 dark:ring-amber-900/30' : ''}`}>
                             <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(log.timestamp).toLocaleDateString('pt-BR')}</span>
                                     <span className={`text-xs font-mono px-2 py-0.5 rounded ${deviation ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>{new Date(log.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                     {deviation && <div className="text-red-500 scale-75 animate-pulse"><AlertCircleIcon /></div>}
                                 </div>
                                 <div className="flex items-center gap-2 flex-wrap mt-2">
                                    <LogBadge type={log.type} />
                                    {deviation && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${deviation.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {deviation.status === 'late' ? 'Atraso' : 'Antecipado'}
                                        </span>
                                    )}
                                    {log.location && (
                                        <a 
                                            href={`https://www.google.com/maps?q=${log.location.latitude},${log.location.longitude}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-lg text-xs font-semibold"
                                            title={`Lat: ${log.location.latitude}, Lng: ${log.location.longitude}`}
                                        >
                                            <div className="scale-75 mr-1"><MapPinIcon /></div> Local
                                        </a>
                                    )}
                                 </div>
                             </div>
                             <button onClick={() => handleEdit(log)} className="p-2 text-slate-400 hover:text-brand-600"><EditIcon /></button>
                         </div>
                     );
                })}
            </div>
        </div>

        {/* Stats & Report */}
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 border border-slate-100 dark:border-slate-700 flex flex-col h-[400px]">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Atividade Recente</h3>
                <div className="flex-1 w-full -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} stroke={isDark ? "#94a3b8" : "#94a3b8"} />
                            <YAxis axisLine={false} tickLine={false} fontSize={12} allowDecimals={false} stroke={isDark ? "#94a3b8" : "#94a3b8"} />
                            <Tooltip 
                                cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}} 
                                contentStyle={{
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    backgroundColor: isDark ? '#1e293b' : '#fff',
                                    color: isDark ? '#fff' : '#000'
                                }}
                            />
                            <Bar dataKey="registros" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {analysis && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl shadow-sm p-6 border border-indigo-100 dark:border-indigo-800/30">
                    <h3 className="text-indigo-900 dark:text-indigo-200 font-bold mb-4 flex items-center text-lg">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg mr-2 text-indigo-600 dark:text-indigo-300"><SparklesIcon /></div>
                        Insights IA
                    </h3>
                    <div className="prose prose-sm prose-indigo dark:prose-invert max-h-80 overflow-y-auto custom-scrollbar">
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Register Confirmation Modal */}
      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Confirmar Registro">
        <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex flex-col items-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wide mb-1">Você está registrando</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mb-2">{pendingLogType === LogType.ENTRY ? 'Entrada' : pendingLogType === LogType.LUNCH_START ? 'Saída Almoço' : pendingLogType === LogType.LUNCH_END ? 'Volta Almoço' : 'Saída'}</p>
                <div className="text-3xl font-mono text-slate-800 dark:text-white font-bold">
                    {currentTime.toLocaleTimeString('pt-BR')}
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">
                    Observações (Opcional)
                </label>
                <textarea 
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white resize-none"
                    rows={3}
                    placeholder="Ex: Cheguei atrasado devido ao trânsito; Consulta médica; etc."
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-2">
                <Button variant="ghost" onClick={() => setIsRegisterModalOpen(false)} disabled={isLocationLoading}>Cancelar</Button>
                <Button onClick={finalizeRegister} className="px-8" isLoading={isLocationLoading}>
                    {isLocationLoading ? 'Obtendo Local...' : 'Confirmar'}
                </Button>
            </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!isEditing} onClose={() => setIsEditing(null)} title={currentUserRole === Role.ADMIN ? "Aprovar/Corrigir Registro" : "Solicitar Correção"}>
        <div className="space-y-5">
            <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                {currentUserRole === Role.ADMIN 
                    ? "Ao salvar, um email de notificação será enviado ao funcionário informando a correção."
                    : "Ao salvar, um email será enviado ao seu gestor solicitando a correção deste registro."
                }
            </p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nova Data</label>
                    <input type="date" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-700 dark:text-slate-200 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-slate-800" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Novo Horário</label>
                    <input type="time" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-700 dark:text-slate-200 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-slate-800" value={editTime} onChange={e => setEditTime(e.target.value)} />
                </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                <Button variant="ghost" onClick={() => setIsEditing(null)}>Cancelar</Button>
                <Button onClick={saveEdit}>
                    {currentUserRole === Role.ADMIN ? "Confirmar Ajuste" : "Enviar Solicitação"}
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

const AdminDashboard: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState<Partial<User>>({ role: Role.EMPLOYEE });
    const [settings, setSettingsState] = useState<CompanySettings>(getSettings());
    const [selectedUserForView, setSelectedUserForView] = useState<User | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        setUsers(getUsers());
        setSettingsState(getSettings());
    }, []);

    const handleAddUser = () => {
        if (!newUser.name || !newUser.password) {
            showToast("Por favor, preencha o Nome e o Código (Senha).", 'error');
            return;
        }

        let finalEmail = newUser.email;
        if (!finalEmail) {
            const cleanName = newUser.name.toLowerCase().replace(/\s+/g, '.');
            finalEmail = `${cleanName}@interno.com`;
        }
        
        const user: User = {
            id: generateId(),
            name: newUser.name,
            email: finalEmail,
            password: newUser.password,
            role: newUser.role || Role.EMPLOYEE,
            position: newUser.position || 'Funcionário'
        };
        saveUser(user);
        
        sendEmail(
            user.email,
            "Bem-vindo ao PontoCerto",
            `Sua conta foi criada. Login: ${user.email}, Senha: ${user.password}`
        );
        
        setUsers(getUsers());
        setIsAddModalOpen(false);
        setNewUser({ role: Role.EMPLOYEE });
        showToast('Funcionário cadastrado com sucesso!', 'success');
    };

    const handleSaveSettings = () => {
        saveSettings(settings);
        setIsSettingsModalOpen(false);
        showToast('Configurações salvas com sucesso!', 'success');
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Tem certeza que deseja remover este funcionário?")) {
            deleteUser(id);
            setUsers(getUsers());
            showToast('Funcionário removido.', 'info');
        }
    };

    const handleGeneratePDF = (e: React.MouseEvent, user: User) => {
      e.stopPropagation();
      const userLogs = getUserLogs(user.id);
      generateEmployeePDF(user, userLogs, settings);
      showToast('Relatório PDF gerado!', 'success');
    };

    const handleExportData = () => {
        const data = getAllData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_pontocerto_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Backup exportado!', 'success');
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (importData(content)) {
                showToast("Dados restaurados! Atualizando...", 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast("Erro ao importar dados.", 'error');
            }
        };
        reader.readAsText(file);
    };

    if (selectedUserForView) {
        return (
            <div className="animate-fade-in">
                <Button variant="outline" className="mb-6" onClick={() => setSelectedUserForView(null)} title="Voltar para a lista de funcionários">
                    &larr; Voltar para Lista
                </Button>
                <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                     <div className="h-16 w-16 bg-brand-100 dark:bg-brand-900/50 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 text-2xl font-bold">
                        {selectedUserForView.name.charAt(0)}
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedUserForView.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400">{selectedUserForView.position} • {selectedUserForView.email}</p>
                     </div>
                </div>
                <EmployeeDashboard user={selectedUserForView} currentUserRole={Role.ADMIN} isDark={isDark} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Equipe</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os colaboradores do Espaço Hidro.</p>
                </div>
                <div className="flex space-x-3 w-full md:w-auto">
                    <Button variant="outline" onClick={() => setIsSettingsModalOpen(true)} title="Configurações da Empresa" className="flex-1 md:flex-none">
                        <SettingsIcon />
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)} title="Adicionar novo funcionário" className="flex-1 md:flex-none shadow-brand-500/20">
                        <PlusIcon /> <span className="ml-2">Novo</span>
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
                {/* Mobile Card View for Users */}
                <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {users.map(u => (
                        <div key={u.id} onClick={() => setSelectedUserForView(u)} className="p-4 active:bg-slate-50 dark:active:bg-slate-700">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-slate-800 dark:text-white text-lg">{u.name}</div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {u.role === Role.ADMIN ? 'Admin' : 'Func'}
                                </span>
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">{u.position}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mb-4">{u.email}</div>
                            
                            <div className="flex justify-end gap-3">
                                <button onClick={(e) => handleGeneratePDF(e, u)} className="text-sm font-medium text-brand-600 dark:text-brand-400 flex items-center bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg" title="Gerar PDF">
                                    <PdfIcon /> <span className="ml-1">Relatório</span>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(u.id); }} className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg" title="Excluir">
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <table className="hidden sm:table w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-5 pl-8">Nome</th>
                            <th className="p-5">Email</th>
                            <th className="p-5">Cargo</th>
                            <th className="p-5">Acesso</th>
                            <th className="p-5 text-right pr-8">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group" onClick={() => setSelectedUserForView(u)}>
                                <td className="p-5 pl-8 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === Role.ADMIN ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300'}`}>
                                        {u.name.charAt(0)}
                                    </div>
                                    {u.name}
                                </td>
                                <td className="p-5 text-slate-600 dark:text-slate-400">{u.email}</td>
                                <td className="p-5 text-slate-600 dark:text-slate-400">{u.position}</td>
                                <td className="p-5">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {u.role === Role.ADMIN ? 'Admin' : 'Colaborador'}
                                    </span>
                                </td>
                                <td className="p-5 text-right pr-8" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleGeneratePDF(e, u)} className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors" title="Gerar Relatório PDF">
                                            <PdfIcon />
                                        </button>
                                        <button onClick={() => handleDelete(u.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir Funcionário">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Cadastrar Novo Talento">
                <div className="space-y-4">
                    <input 
                        type="text" placeholder="Nome Completo" 
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white" 
                        value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} 
                    />
                    <input 
                        type="email" placeholder="Email Corporativo (Opcional para funcionários)" 
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white" 
                        value={newUser.email || ''} onChange={e => setNewUser({...newUser, email: e.target.value})} 
                    />
                    <input 
                        type="text" 
                        placeholder="Código Numérico (Senha)" 
                        inputMode="numeric"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white" 
                        value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} 
                    />
                    <input 
                        type="text" placeholder="Cargo / Função" 
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-slate-800 dark:text-white" 
                        value={newUser.position || ''} onChange={e => setNewUser({...newUser, position: e.target.value})} 
                    />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Nível de Acesso</label>
                        <select 
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 dark:text-white focus:ring-brand-500 focus:border-brand-500 outline-none"
                            value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                        >
                            <option value={Role.EMPLOYEE}>Colaborador</option>
                            <option value={Role.ADMIN}>Administrador</option>
                        </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-2">
                        <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddUser}>Cadastrar</Button>
                    </div>
                </div>
            </Modal>

            {/* Settings Modal with Backup/Restore ONLY (EmailJS removed) */}
            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Parâmetros da Clínica">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase">Horários de Trabalho</h4>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Entrada Padrão</label>
                                <input 
                                    type="time" 
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50 dark:bg-slate-900 dark:text-white"
                                    value={settings.workStart}
                                    onChange={e => setSettingsState({...settings, workStart: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Saída Padrão</label>
                                <input 
                                    type="time" 
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50 dark:bg-slate-900 dark:text-white"
                                    value={settings.workEnd}
                                    onChange={e => setSettingsState({...settings, workEnd: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Início Almoço</label>
                                <input 
                                    type="time" 
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50 dark:bg-slate-900 dark:text-white"
                                    value={settings.lunchStart}
                                    onChange={e => setSettingsState({...settings, lunchStart: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Fim Almoço</label>
                                <input 
                                    type="time" 
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none bg-slate-50 dark:bg-slate-900 dark:text-white"
                                    value={settings.lunchEnd}
                                    onChange={e => setSettingsState({...settings, lunchEnd: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-6 space-y-4">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase">Gerenciamento de Dados</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Use estas opções para transferir dados entre dispositivos (Ex: PC para Celular). Exporte aqui e importe no outro aparelho.</p>
                        
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleExportData} className="w-full text-xs py-3 flex items-center justify-center gap-2">
                                <DownloadIcon /> Exportar Backup
                            </Button>
                            <div className="relative w-full">
                                <input 
                                    type="file" 
                                    accept=".json" 
                                    onChange={handleImportData}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Button variant="outline" className="w-full text-xs py-3 flex items-center justify-center gap-2">
                                    <UploadIcon /> Restaurar Backup
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <Button variant="ghost" onClick={() => setIsSettingsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSettings}>Salvar Alterações</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

const NotificationCenter: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<EmailNotification[]>([]);

    useEffect(() => {
        if (isOpen) {
            setNotifications(getNotifications());
        }
    }, [isOpen]);

    const handleClear = () => {
        clearNotifications();
        setNotifications([]);
    }

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Caixa de Mensagens">
            <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Recentes</p>
                {notifications.length > 0 && (
                    <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-700 font-medium" title="Limpar todas">Limpar Tudo</button>
                )}
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-3 custom-scrollbar -mr-2 pr-2">
                {notifications.length === 0 ? (
                    <div className="text-center py-10 text-slate-300 dark:text-slate-600 flex flex-col items-center">
                        <MailIcon />
                        <span className="mt-2 text-sm">Nenhuma mensagem.</span>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative group hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200 break-words w-3/4 text-sm">{n.subject}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-400 whitespace-nowrap bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700">
                                    {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <div className="text-xs text-brand-600 dark:text-brand-400 mb-2 font-medium">Para: {n.to}</div>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{n.body}</p>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <Button onClick={onClose} variant="secondary">Fechar</Button>
            </div>
        </Modal>
    )
}

// --- MAIN APP ---

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Theme State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    initStorage();
    initRuntimeListeners();
    initNetworkMonitor();

    const interval = setInterval(() => {
        setNotificationCount(getNotifications().length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = (user: User) => {
    setAuthState({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    setAuthState({ user: null, isAuthenticated: false });
  };

  return (
    <ToastContainer>
      <OfflineIndicator />
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
        {!authState.isAuthenticated || !authState.user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <>
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <img 
                          src={COMPANY_LOGO} 
                          alt="Espaço Hidro" 
                          className="h-10 w-auto object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="hidden sm:flex flex-col">
                          <span className="text-brand-900 dark:text-brand-400 font-bold text-lg leading-tight tracking-tight">PontoCerto</span>
                          <span className="text-teal-600 dark:text-teal-400 text-xs font-medium tracking-wide">CLÍNICA DE FISIOTERAPIA</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 sm:space-x-6">
                    <button
                      onClick={toggleTheme}
                      className="p-2.5 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 dark:hover:text-brand-400 transition-colors"
                      title={theme === 'light' ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
                    >
                      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>

                    <button 
                      onClick={() => setIsNotificationsOpen(true)}
                      className="relative p-2.5 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 dark:hover:text-brand-400 transition-colors"
                      title="Notificações"
                    >
                      <BellIcon />
                      {notificationCount > 0 && (
                          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 animate-pulse"></span>
                      )}
                    </button>

                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end hidden sm:flex">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{authState.user.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{authState.user.role === Role.ADMIN ? 'Administrador' : authState.user.position}</span>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                          <UserIcon />
                      </div>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="p-2.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors ml-2"
                      title="Sair"
                    >
                      <LogOutIcon />
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300">
              {authState.user.role === Role.ADMIN ? (
                  <div className="space-y-10">
                      <AdminDashboard isDark={theme === 'dark'} />
                  </div>
              ) : (
                  <EmployeeDashboard user={authState.user} currentUserRole={Role.EMPLOYEE} isDark={theme === 'dark'} onLogout={handleLogout} />
              )}
            </main>

            <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto transition-colors duration-300">
              <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                  &copy; 2024 PontoCerto • Sistema Interno
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-600">
                  Desenvolvido para Espaço Hidro
                </p>
              </div>
            </footer>

            <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
          </>
        )}
      </div>
    </ToastContainer>
  );
};

export default App;