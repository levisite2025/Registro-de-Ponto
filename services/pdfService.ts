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

export const generateEmployeePDF = (user: User, logs: TimeLog[], settings: CompanySettings) => {
  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(18);
  doc.text("PontoCerto - Relatório Individual", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Parâmetros: ${settings.workStart} às ${settings.workEnd} (Almoço: ${settings.lunchStart}-${settings.lunchEnd})`, 14, 26);
  doc.setTextColor(0);

  doc.setFontSize(12);
  doc.text(`Funcionário: ${user.name}`, 14, 36);
  doc.text(`Cargo: ${user.position || "N/A"}`, 14, 42);
  doc.text(`Email: ${user.email}`, 14, 48);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 54);

  // --- Data Preparation ---
  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const tableData = sortedLogs.map(log => {
    const dateObj = new Date(log.timestamp);
    return [
      dateObj.toLocaleDateString('pt-BR'),
      dateObj.toLocaleTimeString('pt-BR'),
      translateType(log.type),
      log.edited ? "Sim (Corrigido)" : "Não",
      log.notes || "-"
    ];
  });

  // --- Table Generation ---
  autoTable(doc, {
    startY: 60,
    head: [['Data', 'Horário', 'Tipo de Registro', 'Editado', 'Observações']],
    body: tableData,
    headStyles: { fillColor: [59, 130, 246] }, // Blue-500 equivalent
    alternateRowStyles: { fillColor: [243, 244, 246] }, // Gray-100
    styles: { fontSize: 10 },
  });

  // --- Footer / Save ---
  const fileName = `Relatorio_Ponto_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};