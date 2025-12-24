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
import { useState, useEffect, useMemo, FC } from "react";
import { toast } from "sonner";
import { Loader2, GripVertical, Search } from "lucide-react";
import { generateSingleLLMResponse } from "@/app/actions";
import * as XLSX from 'xlsx';

import {
  ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  useReactTable, SortingState, ColumnFiltersState,
} from "@tanstack/react-table";
import {
  DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const personas = [
  'Expert Dynamics 365 Sales', 'Expert Dynamics 365 Customer Insights', 'Expert Dynamics 365 Customer Service',
  'Expert Dynamics 365 Contact Center', 'Expert Power Platform', 'Architecte d\'Intégration', 
  'Expert Sécurité Azure', 'Expert Conformité et RGPD'
];

// --- Le panneau de détail pour l'édition d'une ligne ---
function ResultDetailSheet() {
  const { 
    selectedResultIndex, results, llmConfigs, setSelectedResultIndex, 
    updateSingleResult, generationParams 
  } = useProjectStore();

  const [editableResult, setEditableResult] = useState<GenerationResult | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenParams, setRegenParams] = useState(generationParams);

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
      toast.success("Modifications enregistrées !");
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
    toast.info("Régénération en cours...");
    
    try {
      const regeneratedResult = await generateSingleLLMResponse(
        editableResult.question,
        llmConfigs,
        regenParams
      );
      
      const updatedResult = { ...editableResult };
      for (const key in regeneratedResult) {
        if (key !== 'question') {
          updatedResult[key as keyof GenerationResult] = regeneratedResult[key];
        }
      }
      
      setEditableResult(updatedResult);
      toast.success("Réponse régénérée avec succès !");

    } catch (error: any) {
      toast.error("La régénération a échoué.", { description: error.message });
    } finally {
      setIsRegenerating(false);
    }
  };
  
  if (!editableResult) return null;

  return (
    <Sheet open={selectedResultIndex !== null} onOpenChange={(isOpen) => !isRegenerating && setSelectedResultIndex(isOpen ? selectedResultIndex : null)}>
      <SheetContent className="w-full md:w-[60vw] sm:max-w-none flex flex-col">
        <SheetHeader><SheetTitle>Détail et Modification</SheetTitle></SheetHeader>
        {isRegenerating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2">Régénération en cours...</p>
          </div>
        )}
        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          <Card><CardHeader><CardTitle>Question</CardTitle></CardHeader><CardContent><p className="text-sm font-medium">{editableResult.question}</p></CardContent></Card>
          {llmConfigs.filter(c => c.isValidated).map(config => (
            <Card key={config.id}>
              <CardHeader><CardTitle>Réponse de {config.provider}</CardTitle></CardHeader>
              <CardContent><Textarea value={editableResult[config.provider] || ''} onChange={(e) => handleFieldChange(config.provider, e.target.value)} className="h-48 whitespace-pre-wrap font-mono text-xs" /></CardContent>
            </Card>
          ))}
          <Card><CardHeader><CardTitle>Validation</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={editableResult.status} onValueChange={(value) => handleFieldChange('status', value)}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Validée" id="s-validee" /><Label htmlFor="s-validee">Validée</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Doute" id="s-doute" /><Label htmlFor="s-doute">Doute</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Refusée" id="s-refusee" /><Label htmlFor="s-refusee">Refusée</Label></div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
        <SheetFooter>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">Régénérer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Paramètres de Régénération</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Langue</Label><RadioGroup value={regenParams.language} onValueChange={(v) => setRegenParams({...regenParams, language: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Français" id="r-lang-fr" /><Label htmlFor="r-lang-fr">Français</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Anglais" id="r-lang-en" /><Label htmlFor="r-lang-en">Anglais</Label></div></RadioGroup></div>
                <div className="space-y-2"><Label>Taille</Label><RadioGroup value={regenParams.responseLength} onValueChange={(v) => setRegenParams({...regenParams, responseLength: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Courte" id="r-len-s" /><Label htmlFor="r-len-s">Courte</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Moyenne" id="r-len-m" /><Label htmlFor="r-len-m">Moyenne</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Longue" id="r-len-l" /><Label htmlFor="r-len-l">Longue</Label></div></RadioGroup></div>
                <div className="space-y-2"><Label>Persona</Label><Select value={regenParams.persona} onValueChange={(v) => setRegenParams({...regenParams, persona: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{personas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
                <DialogClose asChild><Button onClick={handleRegenerate}>Lancer la Régénération</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave}>Enregistrer et Fermer</Button>
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
      <div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className={`absolute top-0 right-0 h-full w-1 bg-primary/20 opacity-0 group-hover:opacity-100 cursor-col-resize user-select-none`} />
    </TableHead>
  );
};


// --- Le composant principal de l'étape 4 ---
export function Step4_Results() {
  const { 
    results, llmConfigs, setSelectedResultIndex, setResults,
    generationParams, columnOrder, setColumnOrder
  } = useProjectStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isBatchRegenerating, setIsBatchRegenerating] = useState(false);
  const [batchRegenParams, setBatchRegenParams] = useState(generationParams);
  const [batchRegenProgress, setBatchRegenProgress] = useState({ current: 0, total: 0 });
  const [isBatchRegenDialogOpen, setIsBatchRegenDialogOpen] = useState(false);
  
  const validatedConfigs = llmConfigs.filter(c => c.isValidated);

  const columns = useMemo<ColumnDef<GenerationResult>[]>(() => [
    {
      id: 'rowNumber',
      header: 'N°',
      cell: info => <div className="text-center text-muted-foreground">{info.row.index + 1}</div>,
      size: 60,
      enableResizing: false,
    },
    {
      accessorKey: 'question',
      header: 'Question',
      cell: info => <div className="font-medium text-sm p-2">{info.getValue<string>()}</div>,
      size: 450,
      minSize: 200,
      maxSize: 800,
    },
    ...validatedConfigs.map(config => ({
      accessorKey: config.provider,
      header: config.provider,
      cell: info => <div className="text-xs whitespace-pre-wrap font-mono p-2">{(info.getValue<string>() || 'N/A')}</div>,
      size: 400,
      minSize: 150,
      maxSize: 700,
    })),
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: info => {
        const status = info.getValue<GenerationResult['status']>();
        const getBadgeVariant = (s: GenerationResult['status']) => {
          if (s === 'Validée') return 'default';
          if (s === 'Refusée') return 'destructive';
          return 'secondary';
        };
        return <div className="p-2 flex justify-center"><Badge variant={getBadgeVariant(status)}>{status}</Badge></div>;
      },
      size: 150,
      enableResizing: false,
    },
  ], [validatedConfigs]);

  const columnIds = useMemo(() => columns.map(c => c.id || c.accessorKey as string), [columns]);

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
      setColumnOrder(old => {
        const oldIndex = old.indexOf(active.id as string);
        const newIndex = old.indexOf(over!.id as string);
        return arrayMove(old, oldIndex, newIndex);
      });
    }
  };

  const handleExport = () => {
    const dataToExport = table.getRowModel().rows.map(row => {
      const orderedRow: any = {};
      table.getVisibleLeafColumns().forEach(column => {
        const columnId = column.id;
        const header = column.columnDef.header as string;
        if (columnId === 'rowNumber') {
          orderedRow['N°'] = row.index + 1;
        } else {
          orderedRow[header] = row.original[columnId as keyof GenerationResult];
        }
      });
      return orderedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Résultats");
    XLSX.writeFile(workbook, "rfp-studio-results.xlsx");
    toast.success("Fichier Excel exporté avec succès !");
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
            const regeneratedResult = await generateSingleLLMResponse(row.question, llmConfigs, batchRegenParams);
            newResults[row.originalIndex] = regeneratedResult;
        } catch (error) {
            toast.error(`Erreur sur la question: "${row.question.substring(0, 20)}..."`);
        }
        setBatchRegenProgress({ current: i + 1, total: rowsToRegen.length });
    }

    setResults(newResults);
    setIsBatchRegenerating(false);
    toast.success("Régénération en masse terminée !");
    setTimeout(() => {
        setIsBatchRegenDialogOpen(false);
    }, 2000);
  };

  if (results.length === 0) { 
    return (
      <div className="text-center py-12"><h2 className="text-xl font-bold">Étape 4 : Résultats</h2><p className="text-slate-600 mt-4">Aucun résultat. Lancez une génération à l'étape 3.</p></div>
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

  return (
    <div className="space-y-4 w-full">
      <h2 className="text-2xl font-bold">Étape 4 : Résultats</h2>
      <p className="text-slate-600">Filtrez, triez, réorganisez, redimensionnez et exportez vos résultats.</p>
      
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-4 rounded-lg border">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher sur toutes les colonnes..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="pl-10"/>
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto">
          <Select value={table.getColumn('status')?.getFilterValue() as string ?? ''} onValueChange={value => table.getColumn('status')?.setFilterValue(value === 'Tous' ? '' : value)}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filtrer par statut..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Tous les statuts</SelectItem><SelectItem value="Validée">Validée</SelectItem><SelectItem value="Doute">Doute</SelectItem><SelectItem value="Refusée">Refusée</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isBatchRegenDialogOpen} onOpenChange={setIsBatchRegenDialogOpen}>
            <DialogTrigger asChild><Button variant="outline">Régénérer les échecs</Button></DialogTrigger>
            <DialogContent onInteractOutside={(e) => { if(isBatchRegenerating) e.preventDefault() }}>
              <DialogHeader><DialogTitle>Régénération en Masse</DialogTitle></DialogHeader>
              {isBatchRegenerating ? (
                <div className="py-4 space-y-4">
                  <p>La régénération est en cours. Veuillez patienter.</p><Progress value={(batchRegenProgress.current / batchRegenProgress.total) * 100} />
                  <p className="text-sm text-center text-muted-foreground">{batchRegenProgress.current} / {batchRegenProgress.total} réponses traitées</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Langue</Label><RadioGroup value={batchRegenParams.language} onValueChange={(v) => setBatchRegenParams({...batchRegenParams, language: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Français" id="br-lang-fr" /><Label htmlFor="br-lang-fr">Français</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Anglais" id="br-lang-en" /><Label htmlFor="br-lang-en">Anglais</Label></div></RadioGroup></div>
                    <div className="space-y-2"><Label>Taille</Label><RadioGroup value={batchRegenParams.responseLength} onValueChange={(v) => setBatchRegenParams({...batchRegenParams, responseLength: v})}><div className="flex items-center space-x-2"><RadioGroupItem value="Courte" id="br-len-s" /><Label htmlFor="br-len-s">Courte</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Moyenne" id="br-len-m" /><Label htmlFor="br-len-m">Moyenne</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Longue" id="br-len-l" /><Label htmlFor="br-len-l">Longue</Label></div></RadioGroup></div>
                    <div className="space-y-2"><Label>Persona</Label><Select value={batchRegenParams.persona} onValueChange={(v) => setBatchRegenParams({...batchRegenParams, persona: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{personas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsBatchRegenDialogOpen(false)}>Annuler</Button>
                      <Button onClick={handleBatchRegenerate}>Lancer la Régénération</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={handleExport} disabled={isBatchRegenerating}>Exporter</Button>
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
      <ResultDetailSheet />
    </div>
  );
}

