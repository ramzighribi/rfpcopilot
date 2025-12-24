import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LLMConfig = {
  id: string;
  provider: string;
  apiKey: string;
  endpoint: string;
  apiVersion: string;
  deployment: string;
  model: string;
  isValidated: boolean;
};

export type ProjectData = {
  fileName: string;
  columns: string[];
  rows: Record<string, any>[];
  questionColumn: string | null;
  answerColumn: string | null;
};

export type GenerationResult = {
  question: string;
  [provider: string]: string; 
  status: 'Non traité' | 'Doute' | 'Refusée' | 'Validée';
};

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
  setMapping: (type: 'question' | 'answer', column: string) => void;
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
              id: Date.now().toString(), provider: '', apiKey: '', endpoint: '',
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
      setMapping: (type, column) =>
        set((state) => {
          if (!state.projectData) return {};
          const key = type === 'question' ? 'questionColumn' : 'answerColumn';
          return { projectData: { ...state.projectData, [key]: column } };
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

