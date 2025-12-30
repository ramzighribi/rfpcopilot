'use client';
import { useProjectStore, GenerationResult } from "@/store/useProjectStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useMemo, FC, useRef } from "react";
import { toast } from "sonner";
import { Loader2, GripVertical, Search, ArrowDown, ArrowUp, X } from "lucide-react";
import { generateSingleLLMResponse } from "@/app/actions";
import * as XLSX from 'xlsx';
import { useLanguage } from "@/lib/LanguageContext";

import {
  ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  useReactTable, SortingState, ColumnFiltersState,
} from "@tanstack/react-table";
import {
  DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Personas with translation keys (same as Step3)
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

// --- Le panneau de détail pour l'édition d'une ligne ---
function ResultDetailSheet() {
  const { 
    selectedResultIndex, results, llmConfigs, setSelectedResultIndex, 
    updateSingleResult, generationParams 
  } = useProjectStore();
  const { t } = useLanguage();

  const [editableResult, setEditableResult] = useState<GenerationResult | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenParams, setRegenParams] = useState(generationParams);
  const [regenPersonaSearch, setRegenPersonaSearch] = useState('');

  // Selected personas for regeneration
  const regenSelectedPersonas: string[] = regenParams.personas || [];

  // Filtered personas based on search
  const regenFilteredPersonas = useMemo(() => {
    if (!regenPersonaSearch.trim()) return personas;
    const search = regenPersonaSearch.toLowerCase();
    return personas.filter(p => 
      t(p.key as any).toLowerCase().includes(search) || 
      p.value.toLowerCase().includes(search)
    );
  }, [regenPersonaSearch, t]);

  // Toggle persona selection for regeneration
  const toggleRegenPersona = (value: string) => {
    const current = regenSelectedPersonas;
    if (current.includes(value)) {
      setRegenParams({...regenParams, personas: current.filter(p => p !== value) });
    } else {
      setRegenParams({...regenParams, personas: [...current, value] });
    }
  };

  useEffect(() => {
    if (selectedResultIndex !== null && results[selectedResultIndex]) {
      setEditableResult({ ...results[selectedResultIndex] });
      setRegenParams(generationParams);
    } else {
      setEditableResult(null);
    }
  }, [selectedResultIndex, results, generationParams]);

  const handleSave = () => {
    if (selectedResultIndex !== null && editableResult) {
      updateSingleResult(selectedResultIndex, editableResult);
      toast.success(t('changesSaved'));
      setSelectedResultIndex(null);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (editableResult) {
      setEditableResult({ ...editableResult, [field]: value });
    }
  };

  const handleRegenerate = async () => {
    if (!editableResult) return;
    
    setIsRegenerating(true);
    toast.info(t('regenerating'));
    
    try {
      const { result: regenResult } = await generateSingleLLMResponse(
        editableResult.question,
        llmConfigs,
        regenParams
      );
      
      const updatedResult: GenerationResult = { ...editableResult } as GenerationResult;
      for (const key in regenResult) {
        if (key !== 'question') {
          (updatedResult as any)[key] = (regenResult as any)[key];
        }
      }
      const firstProvider = llmConfigs.find(c => c.isValidated)?.provider;
      if (!updatedResult.selectedAnswer && firstProvider && (regenResult as any)[firstProvider]) {
        (updatedResult as any).selectedAnswer = firstProvider;
      }
      
      setEditableResult(updatedResult);
      toast.success(t('regenerationSuccess'));

    } catch (error: any) {
      toast.error(t('regenerationFailed'), { description: error.message });
    } finally {
      setIsRegenerating(false);
    }
  };
  
  if (!editableResult) return null;

  return (
    <Sheet open={selectedResultIndex !== null} onOpenChange={(isOpen) => !isRegenerating && setSelectedResultIndex(isOpen ? selectedResultIndex : null)}>
      <SheetContent className="w-full md:w-[60vw] sm:max-w-none flex flex-col">
        <SheetHeader><SheetTitle>{t('detailAndEdit')}</SheetTitle></SheetHeader>
        {isRegenerating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2">{t('regenerating')}</p>
          </div>
        )}
        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          <Card><CardHeader><CardTitle>{t('question')}</CardTitle></CardHeader><CardContent><p className="text-sm font-medium">{editableResult.question}</p></CardContent></Card>
          {llmConfigs.filter(c => c.isValidated).map(config => (
            <Card key={config.id}>
              <CardHeader><CardTitle>{t('responseFrom')} {config.provider}</CardTitle></CardHeader>
              <CardContent><Textarea value={editableResult[config.provider] || ''} onChange={(e) => handleFieldChange(config.provider, e.target.value)} className="h-48 whitespace-pre-wrap font-mono text-xs" /></CardContent>
            </Card>
          ))}
          {llmConfigs.some(c => c.isValidated) && (
            <Card>
              <CardHeader><CardTitle>{t('chosenResponse')}</CardTitle></CardHeader>
              <CardContent>
                <Select value={editableResult.selectedAnswer || '_auto_'} onValueChange={(v) => handleFieldChange('selectedAnswer', v === '_auto_' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('chooseProvider')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_auto_">{t('firstNonEmpty')}</SelectItem>
                    {llmConfigs.filter(c => c.isValidated).map(c => (
                      <SelectItem key={c.id} value={c.provider}>{c.provider}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
          <Card><CardHeader><CardTitle>{t('validation')}</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={editableResult.status} onValueChange={(value) => handleFieldChange('status', value)}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Validée" id="s-validee" /><Label htmlFor="s-validee">{t('validated')}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Doute" id="s-doute" /><Label htmlFor="s-doute">{t('doubt')}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Refusée" id="s-refusee" /><Label htmlFor="s-refusee">{t('rejected')}</Label></div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
        <SheetFooter>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">{t('regenerate')}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{t('regenerationParams')}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>{t('responseLanguage')}</Label><RadioGroup value={regenParams.language} onValueChange={(v) => setRegenParams({...regenParams, language: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Français" id="r-lang-fr" /><Label htmlFor="r-lang-fr">{t('french')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Anglais" id="r-lang-en" /><Label htmlFor="r-lang-en">{t('english')}</Label></div></RadioGroup></div>
                <div className="space-y-2"><Label>{t('responseLength')}</Label><RadioGroup value={regenParams.responseLength} onValueChange={(v) => setRegenParams({...regenParams, responseLength: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Courte" id="r-len-s" /><Label htmlFor="r-len-s">{t('short')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Moyenne" id="r-len-m" /><Label htmlFor="r-len-m">{t('medium')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Longue" id="r-len-l" /><Label htmlFor="r-len-l">{t('long')}</Label></div></RadioGroup></div>
                <div className="space-y-2">
                  <Label>{t('persona')}</Label>
                  {regenSelectedPersonas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {regenSelectedPersonas.map(p => {
                        const persona = personas.find(per => per.value === p);
                        return (
                          <Badge key={p} variant="secondary" className="cursor-pointer" onClick={() => toggleRegenPersona(p)}>
                            {persona ? t(persona.key as any) : p}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder={t('searchPersona')} 
                      value={regenPersonaSearch} 
                      onChange={(e) => setRegenPersonaSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                    {regenFilteredPersonas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">{t('noPersonaFound')}</p>
                    ) : (
                      regenFilteredPersonas.map(p => (
                        <div key={p.value} className="flex items-center space-x-2 p-1 hover:bg-slate-100 rounded cursor-pointer" onClick={() => toggleRegenPersona(p.value)}>
                          <Checkbox checked={regenSelectedPersonas.includes(p.value)} />
                          <span className="text-sm">{t(p.key as any)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost">{t('cancel')}</Button></DialogClose>
                <DialogClose asChild><Button onClick={handleRegenerate}>{t('startRegeneration')}</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave}>{t('saveAndClose')}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


// --- Le composant d'en-tête de colonne interactif ---
const DraggableHeader: FC<{ header: any }> = ({ header }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: header.column.id });
  const style = { transform: CSS.Transform.toString(transform), transition, width: header.getSize() };

  return (
    <TableHead key={header.id} colSpan={header.colSpan} style={style} ref={setNodeRef} className="relative group bg-slate-50">
      <div {...attributes} {...listeners} className="flex items-center justify-center cursor-grab py-4 px-2">
        <GripVertical className="h-4 w-4 mr-2 text-muted-foreground" />
        <div className="flex-grow font-bold text-slate-700" onClick={header.column.getToggleSortingHandler()}>
          {flexRender(header.column.columnDef.header, header.getContext())}
          {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? null}
        </div>
      </div>
      {header.column.getCanResize() && (
        <div 
          onMouseDown={header.getResizeHandler()} 
          onTouchStart={header.getResizeHandler()} 
          className={`absolute top-0 right-0 h-full w-2 bg-primary cursor-col-resize select-none touch-none ${header.column.getIsResizing() ? 'opacity-100' : 'opacity-0 hover:opacity-50'}`} 
        />
      )}
    </TableHead>
  );
};


// --- Le composant principal de l'étape 4 ---
export function Step4_Results() {
  const { 
    results, llmConfigs, setSelectedResultIndex, setResults,
    generationParams, columnOrder, setColumnOrder, projectData
  } = useProjectStore();
  const { t } = useLanguage();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isBatchRegenerating, setIsBatchRegenerating] = useState(false);
  const [batchRegenParams, setBatchRegenParams] = useState(generationParams);
  const [batchRegenProgress, setBatchRegenProgress] = useState({ current: 0, total: 0 });
  const [isBatchRegenDialogOpen, setIsBatchRegenDialogOpen] = useState(false);
  const [batchPersonaSearch, setBatchPersonaSearch] = useState('');
  
  const validatedConfigs = llmConfigs.filter(c => c.isValidated);
  const validatedProviders = validatedConfigs.map(c => c.provider);

  // Selected personas for batch regeneration
  const batchSelectedPersonas: string[] = batchRegenParams.personas || [];

  // Filtered personas based on search for batch
  const batchFilteredPersonas = useMemo(() => {
    if (!batchPersonaSearch.trim()) return personas;
    const search = batchPersonaSearch.toLowerCase();
    return personas.filter(p => 
      t(p.key as any).toLowerCase().includes(search) || 
      p.value.toLowerCase().includes(search)
    );
  }, [batchPersonaSearch, t]);

  // Toggle persona selection for batch regeneration
  const toggleBatchPersona = (value: string) => {
    const current = batchSelectedPersonas;
    if (current.includes(value)) {
      setBatchRegenParams({...batchRegenParams, personas: current.filter(p => p !== value) });
    } else {
      setBatchRegenParams({...batchRegenParams, personas: [...current, value] });
    }
  };
  const columns = useMemo<ColumnDef<GenerationResult, any>[]>(() => [
    {
      id: 'rowNumber',
      header: t('rowNumber'),
      cell: info => <div className="text-center text-muted-foreground">{info.row.index + 1}</div>,
      size: 60,
      minSize: 40,
      maxSize: 100,
    },
    {
      accessorKey: 'sheetName',
      header: t('sheet'),
      cell: info => <div className="text-sm text-muted-foreground px-2">{info.getValue<string>()}</div>,
      size: 120,
      minSize: 80,
      maxSize: 250,
    },
    {
      accessorKey: 'question',
      header: t('question'),
      cell: info => <div className="font-medium text-sm p-2">{info.getValue<string>()}</div>,
      size: 200,
      minSize: 100,
      maxSize: 600,
    },
    ...validatedConfigs.map(config => ({
      accessorKey: config.provider,
      header: config.provider,
      cell: (info: any) => <div className="text-xs whitespace-pre-wrap font-mono p-2">{(info.getValue() || 'N/A')}</div>,
      size: 500,
      minSize: 200,
      maxSize: 1000,
    })),
    {
      accessorKey: 'selectedAnswer',
      header: t('selectedResponse'),
      cell: (info: any) => {
        const row = info.row.original as GenerationResult;
        const handleSelect = (v: string) => {
          const copy = [...results];
          // "__auto__" signifie utiliser la première réponse non vide
          copy[info.row.index] = { ...row, selectedAnswer: v === '__auto__' ? undefined : v } as any;
          setResults(copy);
        };
        return (
          <Select value={row.selectedAnswer || '__auto__'} onValueChange={handleSelect}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('chooseProvider')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">{t('firstNonEmpty')}</SelectItem>
              {validatedProviders.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      size: 200,
      minSize: 150,
      maxSize: 300,
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: info => {
        const status = info.getValue<GenerationResult['status']>();
        const getBadgeVariant = (s: GenerationResult['status']) => {
          if (s === 'Validée') return 'default';
          if (s === 'Refusée') return 'destructive';
          return 'secondary';
        };
        const getStatusLabel = (s: GenerationResult['status']) => {
          if (s === 'Validée') return t('validated');
          if (s === 'Refusée') return t('rejected');
          return t('doubt');
        };
        return <div className="p-2 flex justify-center"><Badge variant={getBadgeVariant(status)}>{getStatusLabel(status)}</Badge></div>;
      },
      size: 120,
      minSize: 80,
      maxSize: 200,
    },
  ], [validatedConfigs, t]);

  const columnIds = useMemo(() => columns.map((c: any) => c.id || c.accessorKey as string), [columns]);

  useEffect(() => {
    if (columnOrder.length === 0 || columnOrder.length !== columnIds.length) {
      setColumnOrder(columnIds);
    }
  }, [columnIds, columnOrder, setColumnOrder]);

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting, columnFilters, globalFilter, columnOrder },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const old = columnOrder;
      const oldIndex = old.indexOf(active.id as string);
      const newIndex = old.indexOf(over!.id as string);
      setColumnOrder(arrayMove(old, oldIndex, newIndex));
    }
  };

  const handleExport = () => {
    if (!projectData) {
      toast.error("Aucun fichier source chargé.");
      return;
    }

    const workbook = XLSX.read(projectData.workbookBinary, { type: 'binary' });
    const sheetMetaMap = new Map(projectData.sheets.map(s => [s.name, s]));
  const validatedProviders = llmConfigs.filter(c => c.isValidated).map(c => c.provider);

    const ensureRange = (ws: XLSX.WorkSheet, cell: XLSX.CellAddress) => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      range.s.r = Math.min(range.s.r, cell.r);
      range.s.c = Math.min(range.s.c, cell.c);
      range.e.r = Math.max(range.e.r, cell.r);
      range.e.c = Math.max(range.e.c, cell.c);
      ws['!ref'] = XLSX.utils.encode_range(range);
    };

    const getAnswerForResult = (res: GenerationResult) => {
      if (res.selectedAnswer) {
        const val = res[res.selectedAnswer];
        if (typeof val === 'string') return val;
      }
      for (const provider of validatedProviders) {
        const val = res[provider];
        if (typeof val === 'string' && val.trim().length > 0) return val;
      }
      return '';
    };

    let written = 0;
    for (const res of results) {
      const meta = sheetMetaMap.get(res.sheetName);
      const ws = workbook.Sheets[res.sheetName];
      if (!meta || !ws) {
        console.warn(`Feuille introuvable: ${res.sheetName}`);
        continue;
      }
      if (!meta.answerColumn) {
        toast.error(`Colonne réponse non définie pour l'onglet ${res.sheetName}.`);
        return;
      }

      const colIndex = meta.columns.indexOf(meta.answerColumn);
      if (colIndex === -1) {
        toast.error(`Impossible de trouver la colonne réponse "${meta.answerColumn}" dans l'onglet ${res.sheetName}.`);
        return;
      }

      const cellAddr = { c: colIndex, r: res.rowIndex + 1 }; // +1 car ligne 1 = header
      const cellRef = XLSX.utils.encode_cell(cellAddr);
      ws[cellRef] = { t: 's', v: getAnswerForResult(res) };
      ensureRange(ws, cellAddr);
      written++;
    }

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    const buf = new ArrayBuffer(wbout.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < wbout.length; ++i) view[i] = wbout.charCodeAt(i) & 0xff;
    const blob = new Blob([buf], { type: 'application/octet-stream' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rfp-${projectData.fileName}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Fichier exporté (${written} lignes mises à jour).`);
  };

  const handleBatchRegenerate = async () => {
    const rowsToRegen = results.map((res, index) => ({ ...res, originalIndex: index }))
                              .filter(res => res.status === 'Doute' || res.status === 'Refusée');
    if (rowsToRegen.length === 0) {
      toast.info("Aucune réponse à régénérer.");
      setIsBatchRegenDialogOpen(false);
      return;
    }
    
    setIsBatchRegenerating(true);
    setBatchRegenProgress({ current: 0, total: rowsToRegen.length });
    
    const newResults = [...results];
    for (let i = 0; i < rowsToRegen.length; i++) {
        const row = rowsToRegen[i];
        try {
            const { result: regenResult } = await generateSingleLLMResponse(row.question, llmConfigs, batchRegenParams);
            const firstProvider = validatedProviders[0];
            const initialSelected = firstProvider && regenResult[firstProvider] ? firstProvider : (row.selectedAnswer || '');
            newResults[row.originalIndex] = { 
              ...row,
              ...regenResult, 
              question: row.question,  // Preserve original question
              sheetName: row.sheetName, 
              rowIndex: row.rowIndex, 
              selectedAnswer: initialSelected 
            } as any;
        } catch (error) {
            toast.error(`Erreur sur la question: "${row.question.substring(0, 20)}..."`);
        }
        setBatchRegenProgress({ current: i + 1, total: rowsToRegen.length });
    }

    setResults(newResults);
    setIsBatchRegenerating(false);
    toast.success(t('batchRegenComplete'));
    setTimeout(() => {
        setIsBatchRegenDialogOpen(false);
    }, 2000);
  };

  if (results.length === 0) { 
    return (
      <div className="text-center py-12"><h2 className="text-xl font-bold">{t('step4Title')}</h2><p className="text-slate-600 mt-4">{t('noResults')}</p></div>
    );
  }

  const getRowBgColor = (status: GenerationResult['status']) => {
    switch (status) {
      case 'Validée': return 'bg-green-50 hover:bg-green-100';
      case 'Doute': return 'bg-yellow-50 hover:bg-yellow-100';
      case 'Refusée': return 'bg-red-50 hover:bg-red-100';
      default: return 'hover:bg-slate-50';
    }
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('step4Title')}</h2>
          <p className="text-slate-600">{t('step4Description')}</p>
        </div>
        <Button variant="outline" size="icon" onClick={scrollToBottom} title={t('scrollToBottom')}>
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-lg border">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('search')} value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="pl-10"/>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto">
          <Select value={table.getColumn('status')?.getFilterValue() as string ?? ''} onValueChange={value => table.getColumn('status')?.setFilterValue(value === 'Tous' ? '' : value)}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder={t('status')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">All</SelectItem><SelectItem value="Validée">{t('validated')}</SelectItem><SelectItem value="Doute">{t('doubt')}</SelectItem><SelectItem value="Refusée">{t('rejected')}</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isBatchRegenDialogOpen} onOpenChange={setIsBatchRegenDialogOpen}>
            <DialogTrigger asChild><Button variant="outline">{t('batchRegenerate')}</Button></DialogTrigger>
            <DialogContent className="max-w-lg" onInteractOutside={(e) => { if(isBatchRegenerating) e.preventDefault() }}>
              <DialogHeader><DialogTitle>{t('batchRegenerate')}</DialogTitle></DialogHeader>
              {isBatchRegenerating ? (
                <div className="py-4 space-y-4">
                  <p>{t('batchRegenProgress')}</p><Progress value={(batchRegenProgress.current / batchRegenProgress.total) * 100} />
                  <p className="text-sm text-center text-muted-foreground">{batchRegenProgress.current} / {batchRegenProgress.total}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>{t('responseLanguage')}</Label><RadioGroup value={batchRegenParams.language} onValueChange={(v) => setBatchRegenParams({...batchRegenParams, language: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Français" id="br-lang-fr" /><Label htmlFor="br-lang-fr">{t('french')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Anglais" id="br-lang-en" /><Label htmlFor="br-lang-en">{t('english')}</Label></div></RadioGroup></div>
                    <div className="space-y-2"><Label>{t('responseLength')}</Label><RadioGroup value={batchRegenParams.responseLength} onValueChange={(v) => setBatchRegenParams({...batchRegenParams, responseLength: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Courte" id="br-len-s" /><Label htmlFor="br-len-s">{t('short')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Moyenne" id="br-len-m" /><Label htmlFor="br-len-m">{t('medium')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Longue" id="br-len-l" /><Label htmlFor="br-len-l">{t('long')}</Label></div></RadioGroup></div>
                    <div className="space-y-2">
                      <Label>{t('persona')}</Label>
                      {batchSelectedPersonas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {batchSelectedPersonas.map(p => {
                            const persona = personas.find(per => per.value === p);
                            return (
                              <Badge key={p} variant="secondary" className="cursor-pointer" onClick={() => toggleBatchPersona(p)}>
                                {persona ? t(persona.key as any) : p}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder={t('searchPersona')} 
                          value={batchPersonaSearch} 
                          onChange={(e) => setBatchPersonaSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                        {batchFilteredPersonas.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">{t('noPersonaFound')}</p>
                        ) : (
                          batchFilteredPersonas.map(p => (
                            <div key={p.value} className="flex items-center space-x-2 p-1 hover:bg-slate-100 rounded cursor-pointer" onClick={() => toggleBatchPersona(p.value)}>
                              <Checkbox checked={batchSelectedPersonas.includes(p.value)} />
                              <span className="text-sm">{t(p.key as any)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsBatchRegenDialogOpen(false)}>{t('cancel')}</Button>
                      <Button onClick={handleBatchRegenerate}>{t('startRegeneration')}</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={handleExport} disabled={isBatchRegenerating}>{t('exportExcel')}</Button>
        </div>
      </div>
      
      <div className="border rounded-md overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table style={{ width: table.getTotalSize() }}>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                    {headerGroup.headers.map(header => <DraggableHeader key={header.id} header={header} />)}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(row => (
                <TableRow key={row.id} onClick={() => setSelectedResultIndex(row.index)} className={`cursor-pointer ${getRowBgColor(row.original.status)}`}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }} className="align-top border-r">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      
      <div className="flex justify-end">
        <Button variant="outline" size="icon" onClick={scrollToTop} title={t('scrollToTop')}>
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      
      <ResultDetailSheet />
    </div>
  );
}

