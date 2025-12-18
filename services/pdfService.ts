import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { User, TimeLog, LogType, CompanySettings } from "../types";

const translateType = (type: LogType) => {
  const map = {
    [LogType.ENTRY]: "Entrada",
    [LogType.LUNCH_START]: "Saída Almoço",
    [LogType.LUNCH_END]: "Volta Almoço",
    [LogType.EXIT]: "Saída",
  };
  return map[type] || type;
};

// Função auxiliar para calcular o total de horas trabalhadas com base nos logs
const calculateTotalHours = (logs: TimeLog[]): string => {
  let totalMs = 0;
  // Agrupar logs por data (string local)
  const logsByDate: Record<string, TimeLog[]> = {};

  logs.forEach(log => {
    // Usa a data local para agrupar corretamente o dia
    const dateKey = new Date(log.timestamp).toLocaleDateString();
    if (!logsByDate[dateKey]) logsByDate[dateKey] = [];
    logsByDate[dateKey].push(log);
  });

  Object.values(logsByDate).forEach(dayLogs => {
    const entry = dayLogs.find(l => l.type === LogType.ENTRY);
    const exit = dayLogs.find(l => l.type === LogType.EXIT);
    const lunchStart = dayLogs.find(l => l.type === LogType.LUNCH_START);
    const lunchEnd = dayLogs.find(l => l.type === LogType.LUNCH_END);

    // Só calcula se houver Entrada e Saída
    if (entry && exit) {
      let dayDuration = new Date(exit.timestamp).getTime() - new Date(entry.timestamp).getTime();

      // Se houver intervalo de almoço completo, desconta
      if (lunchStart && lunchEnd) {
        const lunchDuration = new Date(lunchEnd.timestamp).getTime() - new Date(lunchStart.timestamp).getTime();
        dayDuration -= lunchDuration;
      }

      if (dayDuration > 0) totalMs += dayDuration;
    }
  });

  const totalMinutes = Math.floor(totalMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

export const generateEmployeePDF = (user: User, logs: TimeLog[], settings: CompanySettings) => {
  const doc = new jsPDF();

  // --- Header ---
  doc.setFillColor(14, 165, 233); // Brand Blue
  doc.rect(0, 0, 210, 40, 'F'); // Header Background

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("PontoCerto", 14, 18);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de Frequência Individual", 14, 26);

  // --- Info Section ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  const startYInfo = 50;
  
  doc.setFont("helvetica", "bold");
  doc.text("Funcionário:", 14, startYInfo);
  doc.setFont("helvetica", "normal");
  doc.text(user.name, 40, startYInfo);

  doc.setFont("helvetica", "bold");
  doc.text("Cargo:", 14, startYInfo + 6);
  doc.setFont("helvetica", "normal");
  doc.text(user.position || "N/A", 40, startYInfo + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Email:", 110, startYInfo);
  doc.setFont("helvetica", "normal");
  doc.text(user.email, 125, startYInfo);

  doc.setFont("helvetica", "bold");
  doc.text("Emissão:", 110, startYInfo + 6);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString('pt-BR'), 125, startYInfo + 6);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, startYInfo + 12, 196, startYInfo + 12);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Expediente Padrão: ${settings.workStart} às ${settings.workEnd} | Almoço: ${settings.lunchStart}-${settings.lunchEnd}`, 14, startYInfo + 18);

  // --- Data Preparation ---
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const tableData = sortedLogs.map(log => {
    const dateObj = new Date(log.timestamp);
    let rowNotes = log.notes || "";
    
    if (log.location) {
        const geoInfo = `Coord: ${log.location.latitude.toFixed(5)}, ${log.location.longitude.toFixed(5)}`;
        rowNotes = rowNotes ? `${rowNotes} (${geoInfo})` : geoInfo;
    }

    return [
      dateObj.toLocaleDateString('pt-BR'),
      dateObj.toLocaleTimeString('pt-BR'),
      translateType(log.type),
      log.edited ? "Sim (Ajustado)" : "Original",
      rowNotes || "-"
    ];
  });

  // --- Table Generation ---
  autoTable(doc, {
    startY: startYInfo + 25,
    head: [['Data', 'Horário', 'Tipo de Registro', 'Status', 'Observações']],
    body: tableData,
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 'auto' },
    }
  });

  // --- Footer Summary (Total Hours) ---
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  const totalHours = calculateTotalHours(logs);

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(14, finalY + 5, 182, 15, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont("helvetica", "bold");
  
  doc.text("Total de Horas Trabalhadas (Estimado):", 20, finalY + 14);
  
  doc.setFontSize(12);
  doc.setTextColor(14, 165, 233); // Brand Blue
  doc.text(totalHours, 100, finalY + 14);

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("*Cálculo baseado apenas em ciclos fechados de Entrada/Saída descontando almoço quando registrado.", 14, finalY + 28);

  // --- Save ---
  const fileName = `Relatorio_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};