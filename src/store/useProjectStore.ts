import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LLMConfig = {
  id: string;
  provider: string;
  apiKey: string;
  azureAuthMode?: 'apiKey' | 'entraId';
  endpoint: string;
  apiVersion: string;
  deployment: string;
  model: string;
  isValidated: boolean;
};

export type ProjectSheet = {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
  questionColumn: string | null;
  answerColumn: string | null;
  headerRow: number; // 1-based (ligne 1 = première ligne)
  rawData: any[][]; // données brutes pour recalculer les colonnes
  enabled: boolean; // onglet activé pour le traitement
};

export type ProjectData = {
  fileName: string;
  workbookBinary: string; // binaire du fichier chargé pour réécriture
  sheets: ProjectSheet[];
};

export type GenerationResult = {
  question: string;
  sheetName: string;
  rowIndex: number; // index de ligne dans la feuille (0-based, hors header)
  status: 'Non traité' | 'Doute' | 'Refusée' | 'Validée';
  selectedAnswer?: string; // clé du provider choisi pour l'export
} & Record<string, string | number>;

type ProjectState = {
  currentStep: number;
  llmConfigs: LLMConfig[];
  projectData: ProjectData | null;
  generationParams: Record<string, any>;
  results: GenerationResult[];
  generationProgress: { current: number; total: number };
  selectedResultIndex: number | null;
  columnOrder: string[];
  generationLogs: string[]; // NOUVEAU

  setCurrentStep: (step: number) => void;
  addLlmConfig: () => void;
  updateLlmConfig: (index: number, config: Partial<LLMConfig>) => void;
  removeLlmConfig: (index: number) => void;
  loadLlmConfigs: (configs: LLMConfig[]) => void;
  setProjectData: (data: ProjectData) => void;
  setMapping: (sheetName: string, type: 'question' | 'answer', column: string) => void;
  setHeaderRow: (sheetName: string, headerRow: number) => void;
  toggleSheetEnabled: (sheetName: string) => void;
  setGenerationParams: (params: Record<string, any>) => void;
  setResults: (results: GenerationResult[]) => void;
  setGenerationProgress: (progress: { current: number; total: number }) => void;
  setSelectedResultIndex: (index: number | null) => void;
  updateSingleResult: (index: number, newResult: GenerationResult) => void;
  setColumnOrder: (order: string[]) => void;
  addGenerationLog: (log: string) => void; // NOUVEAU
  addMultipleGenerationLogs: (logs: string[]) => void; // NOUVEAU
  clearGenerationLogs: () => void; // NOUVEAU
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentStep: 1,
      llmConfigs: [],
  projectData: null,
      generationParams: {
        language: 'Français',
        responseLength: 'Moyenne',
        persona: 'Expert Dynamics 365 Sales',
        instructions: '',
      },
      results: [],
      generationProgress: { current: 0, total: 0 },
      selectedResultIndex: null,
      columnOrder: [],
      generationLogs: [], // NOUVEAU

      setCurrentStep: (step) => set({ currentStep: step }),
      addLlmConfig: () =>
        set((state) => ({
          llmConfigs: [
            ...state.llmConfigs,
            { 
              id: Date.now().toString(), provider: '', apiKey: '', azureAuthMode: 'apiKey', endpoint: '',
              apiVersion: '2025-01-01-preview', deployment: '',
              model: 'gemini-1.5-flash', isValidated: false 
            },
          ],
        })),
      updateLlmConfig: (index, config) =>
        set((state) => ({
          llmConfigs: state.llmConfigs.map((c, i) => (i === index ? { ...c, ...config } : c)),
        })),
      removeLlmConfig: (index) =>
        set((state) => ({
          llmConfigs: state.llmConfigs.filter((_, i) => i !== index),
        })),
      loadLlmConfigs: (configs) => set({ llmConfigs: configs }),
      setProjectData: (data) => set({ projectData: data }),
      setMapping: (sheetName, type, column) =>
        set((state) => {
          if (!state.projectData) return {};
          const key = type === 'question' ? 'questionColumn' : 'answerColumn';
          const updatedSheets = state.projectData.sheets.map((sheet) =>
            sheet.name === sheetName ? { ...sheet, [key]: column } : sheet
          );
          return { projectData: { ...state.projectData, sheets: updatedSheets } };
        }),
      setHeaderRow: (sheetName, headerRow) =>
        set((state) => {
          if (!state.projectData) return {};
          const updatedSheets = state.projectData.sheets.map((sheet) => {
            if (sheet.name !== sheetName || !sheet.rawData) return sheet;
            // Recalculer les colonnes basées sur la nouvelle ligne d'en-tête
            const headerIndex = headerRow - 1; // headerRow est 1-based
            const rawData = sheet.rawData;
            if (headerIndex < 0 || headerIndex >= rawData.length) return sheet;
            
            const columns = rawData[headerIndex].map((cell: any) => cell?.toString() || '');
            // Recalculer les rows à partir de la ligne après l'en-tête
            const rows = rawData.slice(headerIndex + 1).map((row) => {
              const rowObj: Record<string, any> = {};
              columns.forEach((col, idx) => {
                rowObj[col] = row[idx] ?? '';
              });
              return rowObj;
            });
            return { 
              ...sheet, 
              headerRow, 
              columns, 
              rows,
              // Reset les mappings car les colonnes ont changé
              questionColumn: null,
              answerColumn: null
            };
          });
          return { projectData: { ...state.projectData, sheets: updatedSheets } };
        }),
      toggleSheetEnabled: (sheetName) =>
        set((state) => {
          if (!state.projectData) return {};
          const updatedSheets = state.projectData.sheets.map((sheet) =>
            sheet.name === sheetName ? { ...sheet, enabled: !sheet.enabled } : sheet
          );
          return { projectData: { ...state.projectData, sheets: updatedSheets } };
        }),
       setGenerationParams: (params) => set((state) => ({ generationParams: { ...state.generationParams, ...params } })),
       setResults: (results) => set({ results }),
       setGenerationProgress: (progress) => set({ generationProgress: progress }),
       setSelectedResultIndex: (index) => set({ selectedResultIndex: index }),
       updateSingleResult: (index, newResult) => set((state) => ({
         results: state.results.map((r, i) => (i === index ? newResult : r))
       })),
       setColumnOrder: (order) => set({ columnOrder: order }),
       addGenerationLog: (log) => set((state) => ({ generationLogs: [...state.generationLogs, log] })),
       addMultipleGenerationLogs: (logs) => set((state) => ({ generationLogs: [...state.generationLogs, ...logs] })),
       clearGenerationLogs: () => set({ generationLogs: [] }),
    }),
    {
      name: 'prompt-studio-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

