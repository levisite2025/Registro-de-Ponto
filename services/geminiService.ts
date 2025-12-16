import { GoogleGenAI } from "@google/genai";
import { TimeLog, User, LogType, CompanySettings } from "../types";

const initGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateMonthlyReportAnalysis = async (user: User, logs: TimeLog[], settings: CompanySettings, month: string) => {
  const ai = initGemini();
  if (!ai) return "Chave de API não configurada.";

  const logsText = logs.map(l => {
      const date = new Date(l.timestamp);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${l.type}`;
  }).join('\n');

  const prompt = `
    Atue como um analista de RH especialista.
    Analise os registros de ponto do funcionário ${user.name} (${user.position}) para o mês de ${month}.
    
    PARAMETROS DA EMPRESA (Use para identificar atrasos ou horas extras):
    - Horário de Entrada Padrão: ${settings.workStart}
    - Saída para Almoço Padrão: ${settings.lunchStart}
    - Volta do Almoço Padrão: ${settings.lunchEnd}
    - Horário de Saída Padrão: ${settings.workEnd}

    DADOS BRUTOS DOS REGISTROS:
    ${logsText}

    Por favor, forneça um relatório executivo em Markdown contendo:
    1. Resumo total de horas trabalhadas (estimadas).
    2. Análise de Pontualidade: Identifique dias com atrasos na entrada ou saídas antecipadas baseando-se nos parâmetros acima.
    3. Identificação de Padrões: Horas extras frequentes ou irregularidade no intervalo de almoço.
    4. Feedback: Uma mensagem construtiva para o funcionário baseada no cumprimento dos horários.
    
    Seja conciso, profissional e destaque desvios significativos dos horários padrão.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return "Não foi possível gerar a análise inteligente no momento.";
  }
};