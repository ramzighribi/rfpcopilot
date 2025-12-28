'use client';
import { useProjectStore, ProjectData, ProjectSheet } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UploadCloud, FileText, Loader2, Info, Check, Table2 } from "lucide-react";
import { ChangeEvent, useState } from "react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Step2_Context() {
  const { projectData, setProjectData, setMapping, setHeaderRow, toggleSheetEnabled } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheets: ProjectSheet[] = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          // Stocker toutes les données brutes AVEC les lignes vides pour garder la numérotation Excel
          const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '',  // Valeur par défaut pour les cellules vides
            blankrows: true  // Garder les lignes vides
          });
          const headerRow = 1; // Par défaut, la première ligne
          const columns = rawData.length > 0 ? rawData[0].map((cell: any) => cell?.toString() || '') : [];
          const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
          return { name, columns, rows, questionColumn: null, answerColumn: null, headerRow, rawData, enabled: true };
        });

        if (sheets.length === 0 || sheets.every(s => s.columns.length === 0)) {
          toast.error("Le fichier semble vide ou ne contient pas d'en-têtes.");
          return;
        }

        const newProjectData: ProjectData = {
          fileName: file.name,
          workbookBinary: data,
          sheets,
        };
        setProjectData(newProjectData);
        setSelectedSheet(sheets[0].name);
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
            <CardHeader><CardTitle>Sélection des Onglets</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">Cliquez sur les onglets à traiter. Les onglets sélectionnés sont surlignés en bleu.</p>
              <div className="flex flex-wrap gap-2">
                {projectData.sheets.map(sheet => (
                  <button
                    key={sheet.name}
                    onClick={() => toggleSheetEnabled(sheet.name)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200",
                      "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      sheet.enabled
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    <Table2 className="w-4 h-4" />
                    <span className="font-medium">{sheet.name}</span>
                    <span className="text-xs opacity-70">({sheet.rows.length} lignes)</span>
                    {sheet.enabled && (
                      <Check className="w-4 h-4 text-blue-600 ml-1" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {projectData.sheets.filter(s => s.enabled).length} / {projectData.sheets.length} onglet(s) sélectionné(s)
              </p>
            </CardContent>
        </Card>
      )}

      {projectData && projectData.sheets.some(s => s.enabled) && (
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Configuration des Colonnes</span>
                {selectedSheet && (
                  <span className="text-sm font-normal bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    Onglet : {selectedSheet}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sélectionner un onglet à configurer</label>
                <Select value={selectedSheet ?? undefined} onValueChange={setSelectedSheet}>
                  <SelectTrigger><SelectValue placeholder="Choisir un onglet à configurer" /></SelectTrigger>
                  <SelectContent>
                    {projectData.sheets.filter(s => s.enabled).map(sheet => (
                      <SelectItem key={sheet.name} value={sheet.name}>
                        {sheet.name} {sheet.questionColumn && sheet.answerColumn ? '✓' : '⚠️'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSheet && (
                <div className="space-y-4">
                  {(() => {
                    const sheet = projectData.sheets.find(s => s.name === selectedSheet)!;
                    const maxRows = sheet.rawData?.length || 1;
                    return (
                      <>
                        {/* Sélecteur de ligne d'en-tête */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">
                              <strong>Pour l'onglet "{sheet.name}"</strong> : indiquez le numéro de la ligne contenant les noms de colonnes. 
                              Chaque onglet peut avoir sa propre ligne d'en-tête.
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-blue-800">Ligne d'en-tête pour "{sheet.name}" :</label>
                            <Input
                              type="number"
                              min={1}
                              max={maxRows}
                              value={sheet.headerRow}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value >= 1 && value <= maxRows) {
                                  setHeaderRow(sheet.name, value);
                                }
                              }}
                              className="w-20 h-8"
                            />
                            <span className="text-xs text-blue-600">
                              (1 = première ligne, max: {maxRows})
                            </span>
                          </div>
                        </div>

                        {/* Aperçu des premières lignes */}
                        {sheet.rawData && sheet.rawData.length > 0 && (
                          <div className="bg-slate-50 border rounded-md p-3">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Aperçu des lignes (numéros Excel) - La ligne {sheet.headerRow} est utilisée comme en-tête :
                            </p>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                              <table className="text-xs border-collapse w-full">
                                <tbody>
                                  {sheet.rawData.slice(0, Math.max(15, sheet.headerRow + 5)).map((row, rowIdx) => {
                                    const excelRowNumber = rowIdx + 1; // Numéro de ligne Excel (1-based)
                                    const isHeaderRow = excelRowNumber === sheet.headerRow;
                                    const isDataRow = excelRowNumber > sheet.headerRow;
                                    return (
                                      <tr 
                                        key={rowIdx} 
                                        className={cn(
                                          isHeaderRow && 'bg-green-100 font-semibold',
                                          !isHeaderRow && !isDataRow && 'bg-slate-100 text-slate-400'
                                        )}
                                      >
                                        <td className={cn(
                                          "border px-2 py-1 font-medium text-center w-12",
                                          isHeaderRow ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-600"
                                        )}>
                                          {excelRowNumber}
                                        </td>
                                        {(row as any[]).slice(0, 8).map((cell, cellIdx) => (
                                          <td key={cellIdx} className="border px-2 py-1 max-w-[150px] truncate">
                                            {cell?.toString() || <span className="text-slate-300">-</span>}
                                          </td>
                                        ))}
                                        {(row as any[]).length > 8 && (
                                          <td className="border px-2 py-1 text-slate-400">...</td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              La ligne surlignée en vert (ligne {sheet.headerRow}) est utilisée comme en-tête. Les lignes grisées au-dessus sont ignorées.
                            </p>
                          </div>
                        )}

                        {/* Mapping des colonnes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Colonne des Questions</label>
                            <Select 
                              key={`question-${sheet.name}-${sheet.headerRow}`}
                              onValueChange={(value) => setMapping(sheet.name, 'question', value)} 
                              value={sheet.questionColumn || ""}
                            >
                              <SelectTrigger><SelectValue placeholder="Choisir une colonne..." /></SelectTrigger>
                              <SelectContent>
                                {sheet.columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Colonne des Réponses (Référence)</label>
                            <Select 
                              key={`answer-${sheet.name}-${sheet.headerRow}`}
                              onValueChange={(value) => setMapping(sheet.name, 'answer', value)} 
                              value={sheet.answerColumn || ""}
                            >
                              <SelectTrigger><SelectValue placeholder="Choisir une colonne..." /></SelectTrigger>
                              <SelectContent>
                                {sheet.columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
        </Card>
      )}

      {/* Récapitulatif des onglets sélectionnés */}
      {projectData && projectData.sheets.some(s => s.enabled) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Récapitulatif des onglets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectData.sheets.filter(s => s.enabled).map(sheet => {
                const isComplete = sheet.questionColumn && sheet.answerColumn;
                return (
                  <div 
                    key={sheet.name}
                    onClick={() => setSelectedSheet(sheet.name)}
                    className={cn(
                      "relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md",
                      isComplete 
                        ? "bg-green-50 border-green-300 hover:border-green-400" 
                        : "bg-amber-50 border-amber-300 hover:border-amber-400",
                      selectedSheet === sheet.name && "ring-2 ring-blue-500 ring-offset-2"
                    )}
                  >
                    {/* Badge de statut */}
                    <div className={cn(
                      "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                      isComplete ? "bg-green-500" : "bg-amber-500"
                    )}>
                      {isComplete ? <Check className="w-4 h-4" /> : "!"}
                    </div>

                    {/* Nom de l'onglet */}
                    <div className="flex items-center gap-2 mb-3">
                      <Table2 className={cn("w-4 h-4", isComplete ? "text-green-600" : "text-amber-600")} />
                      <span className="font-semibold text-slate-800">{sheet.name}</span>
                    </div>

                    {/* Détails */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Ligne d'en-tête:</span>
                        <span className="font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{sheet.headerRow}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Questions:</span>
                        <span className={cn(
                          "font-medium px-2 py-0.5 rounded",
                          sheet.questionColumn 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-600"
                        )}>
                          {sheet.questionColumn || "Non défini"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Réponses:</span>
                        <span className={cn(
                          "font-medium px-2 py-0.5 rounded",
                          sheet.answerColumn 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-600"
                        )}>
                          {sheet.answerColumn || "Non défini"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Lignes:</span>
                        <span className="font-medium text-slate-700">{sheet.rows.length}</span>
                      </div>
                    </div>
                    
                    {/* Indication de clic */}
                    <p className="text-xs text-slate-400 mt-2 text-center">Cliquer pour configurer</p>
                  </div>
                );
              })}
            </div>
            
            {/* Résumé global */}
            <div className="mt-4 p-3 bg-slate-100 rounded-lg flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-medium">{projectData.sheets.filter(s => s.enabled && s.questionColumn && s.answerColumn).length}</span>
                <span> / </span>
                <span className="font-medium">{projectData.sheets.filter(s => s.enabled).length}</span>
                <span> onglet(s) prêt(s)</span>
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium">
                  {projectData.sheets.filter(s => s.enabled).reduce((acc, s) => acc + s.rows.length, 0)}
                </span>
                <span> lignes au total</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


