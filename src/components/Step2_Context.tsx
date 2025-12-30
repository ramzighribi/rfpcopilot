'use client';
import { useProjectStore, ProjectData, ProjectSheet } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UploadCloud, FileText, Loader2, Info, Check, Table2, RotateCcw } from "lucide-react";
import { ChangeEvent, useState } from "react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

// Helper pour tronquer le texte avec tooltip
const truncateText = (text: string, maxLength: number = 20) => {
  if (!text || text.length <= maxLength) return { text, isTruncated: false };
  return { text: text.substring(0, maxLength) + '...', isTruncated: true, fullText: text };
};

export function Step2_Context() {
  const { projectData, setProjectData, setMapping, setHeaderRow, toggleSheetEnabled, setCurrentStep } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const { t } = useLanguage();

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
          
          // Déterminer la plage réelle du worksheet
          const ref = worksheet['!ref'];
          if (!ref) {
            return { name, columns: [], rows: [], questionColumn: null, answerColumn: null, headerRow: 1, rawData: [], enabled: true };
          }
          
          const range = XLSX.utils.decode_range(ref);
          const lastCol = range.e.c; // Dernière colonne (0-indexed)
          const lastRow = range.e.r; // Dernière ligne (0-indexed)
          
          // Construire rawData en accédant directement aux cellules
          // Cela garantit que les numéros de lignes correspondent EXACTEMENT à Excel
          const rawData: any[][] = [];
          for (let r = 0; r <= lastRow; r++) {
            const row: any[] = [];
            for (let c = 0; c <= lastCol; c++) {
              const cellAddress = XLSX.utils.encode_cell({ r, c });
              const cell = worksheet[cellAddress];
              row.push(cell ? cell.v : '');
            }
            rawData.push(row);
          }
          
          const headerRow = 1; // Par défaut, la première ligne
          const columns = rawData.length > 0 ? rawData[0].map((cell: any) => cell?.toString() || '') : [];
          const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
          return { name, columns, rows, questionColumn: null, answerColumn: null, headerRow, rawData, enabled: true };
        });

        if (sheets.length === 0 || sheets.every(s => s.columns.length === 0)) {
          toast.error(t('fileEmpty'));
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
        toast.error(t('fileInvalid'), { description: t('fileInvalidDesc') });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t('step2Title')}</h2>
      <p className="text-slate-600">{t('step2Description')}</p>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('fileLoading')}</CardTitle>
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
                {isLoading ? t('fileAnalyzing') : t('fileDragDrop')}
              </p>
              <input type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} disabled={isLoading} />
            </label>
          ) : (
             <div className="flex items-center justify-between p-4 bg-slate-100 rounded-md">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-slate-700" />
                  <p className="ml-4 font-medium">{projectData.fileName}</p>
                </div>
                <Button variant="link" size="sm" onClick={() => setProjectData(null!)}>{t('change')}</Button>
             </div>
          )}
        </CardContent>
      </Card>
      
      {/* Récapitulatif des onglets - SHEET SELECTION */}
      {projectData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('sheetSelection')}
            </CardTitle>
            <p className="text-sm text-slate-600">{t('sheetSelectionHelp')}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectData.sheets.map(sheet => {
                const isComplete = sheet.questionColumn && sheet.answerColumn;
                const isEnabled = sheet.enabled;
                const questionColTrunc = truncateText(sheet.questionColumn || "-");
                const answerColTrunc = truncateText(sheet.answerColumn || "-");
                return (
                  <div 
                    key={sheet.name}
                    onClick={() => {
                      if (isEnabled) {
                        setSelectedSheet(sheet.name);
                      } else {
                        toggleSheetEnabled(sheet.name);
                        setSelectedSheet(sheet.name);
                      }
                    }}
                    className={cn(
                      "relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md",
                      !isEnabled && "bg-slate-100 border-slate-200 opacity-60 hover:opacity-80",
                      isEnabled && isComplete && "bg-green-50 border-green-300 hover:border-green-400",
                      isEnabled && !isComplete && "bg-amber-50 border-amber-300 hover:border-amber-400",
                      selectedSheet === sheet.name && isEnabled && "ring-2 ring-blue-500 ring-offset-2"
                    )}
                  >
                    {/* Bouton toggle enabled */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSheetEnabled(sheet.name);
                        if (selectedSheet === sheet.name && sheet.enabled) {
                          setSelectedSheet(null);
                        }
                      }}
                      className={cn(
                        "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all",
                        isEnabled ? "bg-blue-500 hover:bg-blue-600" : "bg-slate-400 hover:bg-slate-500"
                      )}
                      title={isEnabled ? t('clickToDisable') : t('clickToEnable')}
                    >
                      {isEnabled ? <Check className="w-4 h-4" /> : <span className="text-xs">+</span>}
                    </button>

                    {/* Badge de statut (seulement si enabled) */}
                    {isEnabled && (
                      <div className={cn(
                        "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
                        isComplete ? "bg-green-500" : "bg-amber-500"
                      )}>
                        {isComplete ? <Check className="w-4 h-4" /> : "!"}
                      </div>
                    )}

                    {/* Nom de l'onglet */}
                    <div className="flex items-center gap-2 mb-3">
                      <Table2 className={cn(
                        "w-4 h-4",
                        !isEnabled && "text-slate-400",
                        isEnabled && isComplete && "text-green-600",
                        isEnabled && !isComplete && "text-amber-600"
                      )} />
                      <span className={cn("font-semibold", isEnabled ? "text-slate-800" : "text-slate-500")}>{sheet.name}</span>
                    </div>

                    {/* Détails */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('headerRowLabel')}:</span>
                        <span className={cn(
                          "font-medium px-2 py-0.5 rounded",
                          isEnabled ? "text-blue-700 bg-blue-100" : "text-slate-500 bg-slate-200"
                        )}>{sheet.headerRow}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('questionColumn')}:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "font-medium px-2 py-0.5 rounded cursor-default",
                                !isEnabled && "bg-slate-200 text-slate-500",
                                isEnabled && sheet.questionColumn && "bg-green-100 text-green-700",
                                isEnabled && !sheet.questionColumn && "bg-red-100 text-red-600"
                              )}>
                                {questionColTrunc.text}
                              </span>
                            </TooltipTrigger>
                            {questionColTrunc.isTruncated && (
                              <TooltipContent>
                                <p>{questionColTrunc.fullText}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('answerColumn')}:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "font-medium px-2 py-0.5 rounded cursor-default",
                                !isEnabled && "bg-slate-200 text-slate-500",
                                isEnabled && sheet.answerColumn && "bg-green-100 text-green-700",
                                isEnabled && !sheet.answerColumn && "bg-red-100 text-red-600"
                              )}>
                                {answerColTrunc.text}
                              </span>
                            </TooltipTrigger>
                            {answerColTrunc.isTruncated && (
                              <TooltipContent>
                                <p>{answerColTrunc.fullText}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">{t('rows')}:</span>
                        <span className="font-medium text-slate-700">{sheet.rows.length}</span>
                      </div>
                    </div>
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
                <span> {t('sheetsConfigured')}</span>
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium">
                  {projectData.sheets.filter(s => s.enabled).reduce((acc, s) => acc + s.rows.length, 0)}
                </span>
                <span> {t('lines')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* COLUMN CONFIG - après Sheet Selection */}
      {projectData && projectData.sheets.some(s => s.enabled) && (
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('columnConfig')}</span>
                {selectedSheet && (
                  <span className="text-sm font-normal bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {t('currentSheet')} : {selectedSheet}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('selectSheetToConfigure')}</label>
                <Select value={selectedSheet ?? undefined} onValueChange={setSelectedSheet}>
                  <SelectTrigger><SelectValue placeholder={t('chooseSheet')} /></SelectTrigger>
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
                              <strong>"{sheet.name}"</strong> : {t('headerRowInfo')}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-blue-800">{t('headerRowLabel')} "{sheet.name}" :</label>
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
                              ({t('firstRow')}, {t('max')}: {maxRows})
                            </span>
                          </div>
                        </div>

                        {/* Mapping des colonnes - AVANT l'aperçu */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">{t('questionColumn')}</label>
                            <Select 
                              key={`question-${sheet.name}-${sheet.headerRow}`}
                              onValueChange={(value) => setMapping(sheet.name, 'question', value)} 
                              value={sheet.questionColumn || ""}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('selectQuestionCol')} />
                              </SelectTrigger>
                              <SelectContent>
                                {sheet.columns
                                  .filter(col => col && col.trim() !== '')
                                  .map((col, idx) => {
                                    const colTrunc = truncateText(col, 30);
                                    return (
                                      <SelectItem key={`${col}-${idx}`} value={col} title={colTrunc.isTruncated ? col : undefined}>
                                        {colTrunc.text}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">{t('answerColumn')}</label>
                            <Select 
                              key={`answer-${sheet.name}-${sheet.headerRow}`}
                              onValueChange={(value) => setMapping(sheet.name, 'answer', value)} 
                              value={sheet.answerColumn || ""}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('selectAnswerCol')} />
                              </SelectTrigger>
                              <SelectContent>
                                {sheet.columns
                                  .filter(col => col && col.trim() !== '')
                                  .map((col, idx) => {
                                    const colTrunc = truncateText(col, 30);
                                    return (
                                      <SelectItem key={`${col}-${idx}`} value={col} title={colTrunc.isTruncated ? col : undefined}>
                                        {colTrunc.text}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Aperçu des premières lignes - APRÈS les colonnes */}
                        {sheet.rawData && sheet.rawData.length > 0 && (
                          <div className="bg-slate-50 border rounded-md p-3">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              {t('rowPreview')} - {t('headerRowLabel')} {sheet.headerRow} {t('headerRowUsed')} :
                            </p>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                              <table className="text-xs border-collapse w-full">
                                <tbody>
                                  {sheet.rawData.slice(0, Math.max(15, sheet.headerRow + 5)).map((row, rowIdx) => {
                                    const excelRowNumber = rowIdx + 1;
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
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
        </Card>
      )}

      {/* Bouton Retour à la configuration */}
      <div className="flex justify-center pt-4">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <RotateCcw className="w-4 h-4" />
          {t('backToConfig')}
        </Button>
      </div>
    </div>
  );
}


