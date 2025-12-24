'use client';
import { useProjectStore, ProjectData } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { ChangeEvent, useState } from "react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

export function Step2_Context() {
  const { projectData, setProjectData, setMapping } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const headerData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const columns = headerData.length > 0 ? headerData[0].map(String) : [];

        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
        
        if (columns.length > 0) {
          const newProjectData: ProjectData = {
            fileName: file.name,
            columns: columns,
            rows: rows,
            questionColumn: null,
            answerColumn: null,
          };
          setProjectData(newProjectData);
        } else {
          toast.error("Le fichier semble vide ou ne contient pas d'en-têtes.");
        }
      } catch (error) {
        console.error("Erreur lors de la lecture du fichier Excel :", error);
        toast.error("Le format du fichier est invalide.", { description: "Veuillez vérifier qu'il s'agit d'un fichier .xlsx valide." });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Étape 2 : Définition du Contexte</h2>
      <p className="text-slate-600">Chargez un fichier Excel (.xlsx) et définissez les colonnes de travail.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Chargement du Fichier</CardTitle>
        </CardHeader>
        <CardContent>
          {!projectData ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
              {isLoading ? (
                <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 text-slate-500" />
              )}
              <p className="mt-2 text-sm text-slate-600">
                {isLoading ? "Analyse du fichier..." : "Cliquez ou glissez-déposez un fichier .xlsx"}
              </p>
              <input type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} disabled={isLoading} />
            </label>
          ) : (
             <div className="flex items-center justify-between p-4 bg-slate-100 rounded-md">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-slate-700" />
                  <p className="ml-4 font-medium">{projectData.fileName}</p>
                </div>
                <Button variant="link" size="sm" onClick={() => setProjectData(null!)}>Changer</Button>
             </div>
          )}
        </CardContent>
      </Card>
      
      {projectData && (
        <Card>
            <CardHeader><CardTitle>Mapping des Colonnes</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium">Colonne des Questions</label>
                    <Select onValueChange={(value) => setMapping('question', value)} value={projectData.questionColumn || undefined}>
                        <SelectTrigger><SelectValue placeholder="Choisir une colonne..." /></SelectTrigger>
                        <SelectContent>
                            {projectData.columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <label className="text-sm font-medium">Colonne des Réponses (Référence)</label>
                    <Select onValueChange={(value) => setMapping('answer', value)} value={projectData.answerColumn || undefined}>
                        <SelectTrigger><SelectValue placeholder="Choisir une colonne..." /></SelectTrigger>
                        <SelectContent>
                            {projectData.columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

