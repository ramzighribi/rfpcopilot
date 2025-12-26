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
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import { generateSingleLLMResponse } from "@/app/actions";

const personas = [
  'Expert Dynamics 365 Sales', 'Expert Dynamics 365 Customer Insights', 'Expert Dynamics 365 Customer Service',
  'Expert Dynamics 365 Contact Center', 'Expert Power Platform', 'Architecte d\'Intégration', 
  'Expert Sécurité Azure', 'Expert Conformité et RGPD'
];

export function Step3_Playground() {
  const { 
    projectData, llmConfigs, setResults, generationParams, setGenerationParams, 
    setCurrentStep, generationProgress, setGenerationProgress,
    generationLogs, addMultipleGenerationLogs, clearGenerationLogs
  } = useProjectStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [generationLogs]);
  
  const handleGenerate = async (withLog: boolean) => {
    if (!projectData) { toast.error("Veuillez charger un fichier à l'étape 2."); return; }
    const mappedSheets = projectData.sheets.filter(s => s.questionColumn);
    if (mappedSheets.length === 0) { toast.error("Aucun onglet n'est mappé."); return; }
    
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
    toast.success("Génération terminée !");
    
    if (withLog) {
      addMultipleGenerationLogs(["✅ TRAITEMENT TERMINÉ !"]);
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
      <h2 className="text-2xl font-bold">Étape 3 : Playground de Génération</h2>
      <p className="text-slate-600">Définissez les paramètres et lancez la génération des réponses.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de Génération</CardTitle>
          <p className="text-sm text-muted-foreground pt-1">
            <span className="font-bold">{projectData ? projectData.sheets.reduce((acc, s) => acc + s.rows.length, 0) : 0}</span> lignes chargées (toutes feuilles).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {isGenerating ? (
            <div className="space-y-2">
              <Label>Progression</Label>
              <Progress value={(generationProgress.current / generationProgress.total) * 100} />
              <p className="text-sm text-center text-slate-600">{generationProgress.current} / {generationProgress.total} questions traitées</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3"><Label>Langue de la réponse</Label><RadioGroup value={generationParams.language} onValueChange={(v) => setGenerationParams({ language: v })} className="flex space-x-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Français" id="lang-fr" /><Label htmlFor="lang-fr">Français</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Anglais" id="lang-en" /><Label htmlFor="lang-en">Anglais</Label></div></RadioGroup></div>
                <div className="space-y-3"><Label>Taille de la réponse</Label><RadioGroup value={generationParams.responseLength} onValueChange={(v) => setGenerationParams({ responseLength: v })} className="flex space-x-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Courte" id="len-s" /><Label htmlFor="len-s">Courte</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Moyenne" id="len-m" /><Label htmlFor="len-m">Moyenne</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Longue" id="len-l" /><Label htmlFor="len-l">Longue</Label></div></RadioGroup></div>
              </div>
              <div className="space-y-2"><Label>Persona</Label><Select value={generationParams.persona} onValueChange={(v) => setGenerationParams({persona: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{personas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Instructions Supplémentaires</Label><Textarea placeholder="Ex: Adopter un ton professionnel..." value={generationParams.instructions} onChange={(e) => setGenerationParams({instructions: e.target.value})} /></div>
            </>
          )}
          
          <div className="flex flex-col space-y-2 pt-4">
            <Button onClick={() => handleGenerate(false)} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '🚀'}
              {isGenerating ? 'Génération en cours...' : 'Lancer la Génération'}
            </Button>
            <Button variant="outline" onClick={() => handleGenerate(true)} disabled={isGenerating} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Générer avec Log
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>Log de Génération en Temps Réel</DialogTitle></DialogHeader>
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

