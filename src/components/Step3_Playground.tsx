'use client';
import { useProjectStore, GenerationResult } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useRef, useEffect, useMemo } from "react";
import { Loader2, FileText, X, Search, Check } from "lucide-react";
import { generateSingleLLMResponse } from "@/app/actions";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

export function Step3_Playground() {
  const { 
    projectData, llmConfigs, setResults, generationParams, setGenerationParams, 
    setCurrentStep, generationProgress, setGenerationProgress,
    generationLogs, addMultipleGenerationLogs, clearGenerationLogs
  } = useProjectStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [personaSearch, setPersonaSearch] = useState('');
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Personas with translation keys
  const personas = [
    { key: 'personaD365Sales', value: 'Expert Dynamics 365 Sales' },
    { key: 'personaD365CustomerInsights', value: 'Expert Dynamics 365 Customer Insights' },
    { key: 'personaD365CustomerService', value: 'Expert Dynamics 365 Customer Service' },
    { key: 'personaD365ContactCenter', value: 'Expert Dynamics 365 Contact Center' },
    { key: 'personaPowerPlatform', value: 'Expert Power Platform' },
    { key: 'personaIntegrationArchitect', value: "Architecte d'Intégration" },
    { key: 'personaAzureSecurity', value: 'Expert Sécurité Azure' },
    { key: 'personaComplianceGDPR', value: 'Expert Conformité et RGPD' },
    { key: 'personaCopilotStudio', value: 'Expert Copilot Studio' },
    { key: 'personaDataScientist', value: 'Microsoft Data Scientist' },
    { key: 'personaAIAzure', value: 'AI Azure Expert' },
  ];

  // Selected personas (array)
  const selectedPersonas: string[] = generationParams.personas || [];

  // Filtered personas based on search
  const filteredPersonas = useMemo(() => {
    if (!personaSearch.trim()) return personas;
    const search = personaSearch.toLowerCase();
    return personas.filter(p => 
      t(p.key as any).toLowerCase().includes(search) || 
      p.value.toLowerCase().includes(search)
    );
  }, [personaSearch, t]);

  // Toggle persona selection
  const togglePersona = (value: string) => {
    const current = selectedPersonas;
    if (current.includes(value)) {
      setGenerationParams({ personas: current.filter(p => p !== value) });
    } else {
      setGenerationParams({ personas: [...current, value] });
    }
  };

  // Generate prompt based on parameters
  const generatedPrompt = useMemo(() => {
    const personaNames = selectedPersonas.map(p => {
      const persona = personas.find(per => per.value === p);
      return persona ? t(persona.key as any) : p;
    });
    
    const lengthMap: Record<string, string> = {
      'Courte': t('short'),
      'Moyenne': t('medium'),
      'Longue': t('long'),
    };

    let prompt = `${t('promptYouAre')} ${personaNames.length > 0 ? personaNames.join(', ') : t('promptExpert')}.\n`;
    prompt += `${t('promptRespondIn')} ${generationParams.language}.\n`;
    prompt += `${t('promptResponseLength')}: ${lengthMap[generationParams.responseLength] || generationParams.responseLength}.\n`;
    prompt += `${t('promptTask')}`;
    
    return prompt;
  }, [selectedPersonas, generationParams.language, generationParams.responseLength, t]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [generationLogs]);

  // Update generationParams with generated prompt
  useEffect(() => {
    setGenerationParams({ generatedPrompt });
  }, [generatedPrompt]);
  
  const handleGenerate = async (withLog: boolean) => {
    if (!projectData) { toast.error(t('noFileLoaded')); return; }
    const mappedSheets = projectData.sheets.filter(s => s.enabled && s.questionColumn);
    if (mappedSheets.length === 0) { toast.error(t('noSheetMapped')); return; }
    
    setIsGenerating(true);
    setResults([]);
    clearGenerationLogs();
    if (withLog) {
      setIsLogOpen(true);
    }
    
    const tasks = mappedSheets.flatMap(sheet =>
      sheet.rows.map((row, idx) => ({
        sheetName: sheet.name,
        rowIndex: idx,
        question: row[sheet.questionColumn!],
      })).filter(t => Boolean(t.question))
    );

    const totalQuestions = tasks.length;
    setGenerationProgress({ current: 0, total: totalQuestions });
    
    const newResults: GenerationResult[] = [];

    for (let i = 0; i < totalQuestions; i++) {
      const { question, sheetName, rowIndex } = tasks[i];
      const logHeader = `--- Début Question ${i + 1}/${totalQuestions}: "${question.substring(0, 40)}..." ---`;
      addMultipleGenerationLogs([logHeader]);
      
      try {
  const { result: generatedResult, logs: responseLogs } = await generateSingleLLMResponse(question, llmConfigs, generationParams);
  const firstProvider = llmConfigs.find(c => c.isValidated)?.provider;
  const initialSelected = firstProvider && (generatedResult as any)[firstProvider] ? firstProvider : '';
  newResults.push({ ...(generatedResult as GenerationResult), sheetName, rowIndex, selectedAnswer: initialSelected });
        addMultipleGenerationLogs(responseLogs);
      } catch (error: any) {
        toast.error(`Erreur sur la question ${i + 1}`, { description: error.message });
        const errorResult = { 
          question, sheetName, rowIndex,
          status: 'Refusée' as const,
          ...llmConfigs.reduce((acc, cfg) => ({...acc, [cfg.provider]: `ERREUR FATALE: ${error.message}`}), {})
        };
        newResults.push(errorResult as GenerationResult);
        addMultipleGenerationLogs([`❌ ERREUR FATALE: ${error.message}`]);
      }
      
      addMultipleGenerationLogs([`--- Fin Question ${i + 1}/${totalQuestions} ---\n`]);
      setGenerationProgress({ current: i + 1, total: totalQuestions });
    }
    
    setResults(newResults);
    setIsGenerating(false);
    toast.success(t('generationComplete'));
    
    if (withLog) {
      addMultipleGenerationLogs([`✅ ${t('processingComplete')}`]);
      setTimeout(() => {
        setIsLogOpen(false);
        setCurrentStep(4);
      }, 3000);
    } else {
      setCurrentStep(4);
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t('step3Title')}</h2>
      <p className="text-slate-600">{t('step3Description')}</p>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('generationParams')}</CardTitle>
          <p className="text-sm text-muted-foreground pt-1">
            <span className="font-bold">{projectData ? projectData.sheets.filter(s => s.enabled).reduce((acc, s) => acc + s.rows.length, 0) : 0}</span> {t('linesToProcess')} ({projectData?.sheets.filter(s => s.enabled).length || 0} {t('sheetsSelected')}).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {isGenerating ? (
            <div className="space-y-2">
              <Label>{t('progress')}</Label>
              <Progress value={(generationProgress.current / generationProgress.total) * 100} />
              <p className="text-sm text-center text-slate-600">{generationProgress.current} / {generationProgress.total} {t('questionsProcessed')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Response Language */}
                <div className="space-y-3">
                  <Label>{t('responseLanguage')}</Label>
                  <RadioGroup 
                    value={generationParams.language} 
                    onValueChange={(v) => setGenerationParams({ language: v })} 
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Français" id="lang-fr" />
                      <Label htmlFor="lang-fr">{t('french')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Anglais" id="lang-en" />
                      <Label htmlFor="lang-en">{t('english')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Espagnol" id="lang-es" />
                      <Label htmlFor="lang-es">{t('spanish')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Italien" id="lang-it" />
                      <Label htmlFor="lang-it">{t('italian')}</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Response Length */}
                <div className="space-y-3">
                  <Label>{t('responseLength')}</Label>
                  <RadioGroup 
                    value={generationParams.responseLength} 
                    onValueChange={(v) => setGenerationParams({ responseLength: v })} 
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Courte" id="len-s" />
                      <Label htmlFor="len-s">{t('short')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Moyenne" id="len-m" />
                      <Label htmlFor="len-m">{t('medium')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Longue" id="len-l" />
                      <Label htmlFor="len-l">{t('long')}</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Persona Multi-Select with Search */}
              <div className="space-y-2">
                <Label>{t('persona')}</Label>
                
                {/* Selected personas as badges */}
                {selectedPersonas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPersonas.map(p => {
                      const persona = personas.find(per => per.value === p);
                      return (
                        <Badge 
                          key={p} 
                          variant="secondary" 
                          className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
                        >
                          {persona ? t(persona.key as any) : p}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                            onClick={() => togglePersona(p)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                {/* Search and dropdown */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder={t('searchPersona')}
                      value={personaSearch}
                      onChange={(e) => setPersonaSearch(e.target.value)}
                      onFocus={() => setIsPersonaDropdownOpen(true)}
                      className="pl-10"
                    />
                  </div>
                  
                  {isPersonaDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsPersonaDropdownOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredPersonas.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500 text-center">
                            {t('noPersonaFound')}
                          </div>
                        ) : (
                          filteredPersonas.map(p => {
                            const isSelected = selectedPersonas.includes(p.value);
                            return (
                              <div
                                key={p.value}
                                onClick={() => togglePersona(p.value)}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100",
                                  isSelected && "bg-blue-50"
                                )}
                              >
                                <span className={cn(isSelected && "font-medium text-blue-700")}>
                                  {t(p.key as any)}
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Generated Prompt (editable) */}
              <div className="space-y-2">
                <Label>{t('generatedPrompt')}</Label>
                <Textarea 
                  value={generationParams.generatedPrompt || generatedPrompt}
                  onChange={(e) => setGenerationParams({ generatedPrompt: e.target.value })}
                  className="min-h-[100px] font-mono text-sm bg-slate-50"
                />
                <p className="text-xs text-slate-500">{t('generatedPromptHelp')}</p>
              </div>

              {/* Additional Instructions */}
              <div className="space-y-2">
                <Label>{t('additionalInstructions')}</Label>
                <Textarea 
                  placeholder={t('additionalInstructionsPlaceholder')} 
                  value={generationParams.instructions} 
                  onChange={(e) => setGenerationParams({instructions: e.target.value})} 
                />
              </div>
            </>
          )}
          
          <div className="flex flex-col space-y-2 pt-4">
            <Button onClick={() => handleGenerate(false)} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '🚀'}
              {isGenerating ? t('generationInProgress') : t('startGeneration')}
            </Button>
            <Button variant="outline" onClick={() => handleGenerate(true)} disabled={isGenerating} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              {t('generateWithLog')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>{t('generationLog')}</DialogTitle></DialogHeader>
            <div ref={logContainerRef} className="flex-1 h-full overflow-y-auto bg-slate-900 text-white font-mono text-xs p-4 rounded-md">
                {generationLogs.map((log, i) => (
                  <p key={i} className={`${log.includes('ERREUR') ? 'text-red-400' : ''} ${log.includes('✅') ? 'text-green-400' : ''}`}>{log}</p>
                ))}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

