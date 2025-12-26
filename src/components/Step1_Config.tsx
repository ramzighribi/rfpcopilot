'use client';

import { useProjectStore, LLMConfig } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Trash2, PlusCircle, CheckCircle, XCircle, Loader2, TestTube2, Save, FolderOpen } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { testLLMConnection, debugAzureConnection } from "@/app/actions";

// On ajoute Anthropic à la liste
const llmOptions = ['OpenAI', 'Azure OpenAI', 'Anthropic', 'Google', 'Mistral'];
const googleModels = ['gemini-1.5-flash', 'gemini-pro', 'gemini-2.5-flash'];
const cardColors = ['border-l-sky-500', 'border-l-violet-500', 'border-l-emerald-500', 'border-l-amber-500', 'border-l-rose-500'];

export function Step1_Config() {
  const { llmConfigs, addLlmConfig, updateLlmConfig, removeLlmConfig, loadLlmConfigs } = useProjectStore();
  const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'error' | 'idle'>>({});
  const [debugState, setDebugState] = useState<{ isLoading: boolean; logs: string[] }>({ isLoading: false, logs: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTestConnection = async (configId: string, index: number) => {
    setTestStatus(prev => ({ ...prev, [configId]: 'testing' }));
    const config = { ...llmConfigs[index] };
    // Si Azure OpenAI et mode Entra ID, on vide la clé API
    if (config.provider === 'Azure OpenAI' && config.azureAuthMode === 'entraId') {
      config.apiKey = '';
    }
    const result = await testLLMConnection(config);
    if (result.success) {
      updateLlmConfig(index, { isValidated: true });
      setTestStatus(prev => ({ ...prev, [configId]: 'success' }));
      toast.success("Succès", { description: result.message });
    } else {
      updateLlmConfig(index, { isValidated: false });
      setTestStatus(prev => ({ ...prev, [configId]: 'error' }));
      toast.error("Échec", { description: result.message });
    }
  };

  const handleAdvancedDebug = async (index: number) => {
    setDebugState({ isLoading: true, logs: [] });
    const config = llmConfigs[index];
    const result = await debugAzureConnection(config);
    setDebugState({ isLoading: false, logs: result.logs });
  };

  const handleSaveConfig = () => {
    const dataStr = JSON.stringify(llmConfigs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'rfp-studio-config.json');
    linkElement.click();
    toast.success("Configuration sauvegardée !");
  };

  const handleLoadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const configs = JSON.parse(text) as LLMConfig[];
        loadLlmConfigs(configs);
        toast.success("Configuration chargée avec succès !");
      } catch (error) {
        toast.error("Le fichier de configuration est invalide.");
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Étape 1 : Connectez vos modèles (LLM)</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveConfig}><Save className="h-4 w-4 mr-2"/>Sauvegarder</Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><FolderOpen className="h-4 w-4 mr-2"/>Charger</Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleLoadConfig} />
        </div>
      </div>
      
      {llmConfigs.map((config, index) => (
        <Card key={config.id} className={`border-l-4 ${cardColors[index % cardColors.length]}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Configuration LLM #{index + 1}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => removeLlmConfig(index)}><Trash2 className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fournisseur</label>
              <Select value={config.provider} onValueChange={(v) => updateLlmConfig(index, { provider: v, isValidated: false })}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{llmOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {config.provider === 'Azure OpenAI' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Méthode d'authentification</label>
                  <div className="flex gap-2">
                    <Button
                      variant={config.azureAuthMode !== 'entraId' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLlmConfig(index, { azureAuthMode: 'apiKey', apiKey: config.apiKey })}
                    >API Key</Button>
                    <Button
                      variant={config.azureAuthMode === 'entraId' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLlmConfig(index, { azureAuthMode: 'entraId' })}
                    >Azure Entra ID</Button>
                  </div>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Endpoint URL</label><Input placeholder="https://..." value={config.endpoint} onChange={(e) => updateLlmConfig(index, { endpoint: e.target.value })} /></div>
                {config.azureAuthMode !== 'entraId' && (
                  <div className="space-y-2"><label className="text-sm font-medium">Clé API</label><Input type="password" value={config.apiKey} onChange={(e) => updateLlmConfig(index, { apiKey: e.target.value })} /></div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium">API Version</label><Input placeholder="2025-01-01-preview" value={config.apiVersion} onChange={(e) => updateLlmConfig(index, { apiVersion: e.target.value })} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Deployment Name</label><Input placeholder="gpt-5-miniRGH" value={config.deployment} onChange={(e) => updateLlmConfig(index, { deployment: e.target.value })} /></div>
                </div>
              </>
            )}

            {config.provider === 'Google' && (
              <>
                <div className="space-y-2"><label className="text-sm font-medium">Clé API</label><Input type="password" value={config.apiKey} onChange={(e) => updateLlmConfig(index, { apiKey: e.target.value })} /></div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modèle</label>
                  <Select value={config.model} onValueChange={(v) => updateLlmConfig(index, { model: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{googleModels.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}

            {config.provider && !['Azure OpenAI', 'Google'].includes(config.provider) && (
               <div className="space-y-2"><label className="text-sm font-medium">Clé API</label><Input type="password" placeholder="sk-..." value={config.apiKey} onChange={(e) => updateLlmConfig(index, { apiKey: e.target.value })} /></div>
            )}
            
            <div className="flex items-center space-x-2">
              <Button onClick={() => handleTestConnection(config.id, index)} disabled={!config.provider || testStatus[config.id] === 'testing'}>
                {testStatus[config.id] === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{testStatus[config.id] === 'success' && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}{testStatus[config.id] === 'error' && <XCircle className="mr-2 h-4 w-4 text-red-500" />}Tester la connexion
              </Button>

              {config.provider === 'Azure OpenAI' && (
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" onClick={() => handleAdvancedDebug(index)}><TestTube2 className="h-4 w-4 mr-2" />Advanced Debug</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader><DialogTitle>Journal de Débogage Azure OpenAI</DialogTitle></DialogHeader>
                    <div className="h-96 overflow-y-auto bg-slate-900 text-white font-mono text-xs p-4 rounded-md">
                      {debugState.isLoading && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span>Test en cours...</span></div>}
                      {debugState.logs.map((log, i) => (<p key={i} className={`${log.includes('❌') || log.includes('ERREUR') ? 'text-red-400' : ''} ${log.includes('✅') ? 'text-green-400' : ''}`}>{log}</p>))}
                    </div>
                    <DialogFooter><Button onClick={() => setDebugState({isLoading: false, logs: []})}>Fermer</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addLlmConfig}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un modèle</Button>
    </div>
  );
}
