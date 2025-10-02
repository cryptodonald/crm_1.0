'use client';

import React, { useState, useRef } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  PREDEFINED_STRUCTURES, 
  VariantOption, 
  ProductStructure,
  StructureField 
} from '@/types/product-structures';
import {
  ArrowLeft,
  Upload,
  Download,
  Plus,
  Trash2,
  Save,
  FileText,
  AlertTriangle,
  Check,
  Settings,
  Edit3,
  Edit,
  Copy,
  Building,
  ArrowUp,
  ArrowDown,
  TestTube2,
  Wrench,
  Cog,
  Database,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { StatsIndicators } from '@/components/ui/stats-indicators';

interface StructureVariant {
  id?: string; // Airtable record ID for existing variants
  structure_name: string;
  field_id: string;
  field_name: string;
  code: string;
  name: string;
  description?: string;
  price_modifier: number;
  cost_modifier: number;
  active: boolean;
  posizione?: number; // Display order for variants within the same field
}

export default function StructureVariantsPage() {
  // Navigation state
  const [activeSection, setActiveSection] = useState<string>('structures');
  
  // Existing states
  const [selectedStructure, setSelectedStructure] = useState<string>('Materasso');
  const [variants, setVariants] = useState<StructureVariant[]>([]);
  const [existingVariants, setExistingVariants] = useState<StructureVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Structure management state
  const [structures, setStructures] = useState<ProductStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [editingStructure, setEditingStructure] = useState<ProductStructure | null>(null);
  const [editingField, setEditingField] = useState<StructureField | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showStructureDialog, setShowStructureDialog] = useState(false);

  // New variant form
  const [newVariant, setNewVariant] = useState<Partial<StructureVariant>>({
    structure_name: 'Materasso',
    field_id: '',
    code: '',
    name: '',
    price_modifier: 0,
    cost_modifier: 0,
    active: true,
  });
  
  // Multiple structures selection for shared variants
  const [selectedStructuresForVariant, setSelectedStructuresForVariant] = useState<string[]>([]);
  
  // Edit variant state
  const [editingVariant, setEditingVariant] = useState<StructureVariant | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null); // Store variant ID to delete
  const [editingVariantStructures, setEditingVariantStructures] = useState<string[]>([]); // Structures for editing variant

  const currentStructure = structures.find(s => s.name === selectedStructure);

  // Mapping logico dei campi - raggruppa campi fisici in categorie logiche
  const getLogicalFields = (structure: ProductStructure) => {
    if (!structure) return [];
    
    const logicalFields = new Map<string, {
      id: string;
      name: string;
      physicalFields: string[];
      description: string;
    }>();
    
    structure.fields.forEach(field => {
      // Mapping per raggruppare campi sx/dx
      let logicalId = field.id;
      let logicalName = field.name;
      
      // Rimuovi suffissi _sx/_dx per creare categorie logiche
      if (field.id.endsWith('_sx') || field.id.endsWith('_dx')) {
        logicalId = field.id.replace(/_sx$|_dx$/g, '');
        logicalName = field.name.replace(/\s+(Sinistro|Destro|Sinistra|Destra)$/gi, '');
      }
      
      if (!logicalFields.has(logicalId)) {
        logicalFields.set(logicalId, {
          id: logicalId,
          name: logicalName,
          physicalFields: [],
          description: field.description?.replace(/\s*\(.*\)$/, '') || ''
        });
      }
      
      logicalFields.get(logicalId)!.physicalFields.push(field.id);
    });
    
    return Array.from(logicalFields.values());
  };

  const logicalFields = getLogicalFields(currentStructure);

  // Navigation configuration
  const navigationSections = [
    {
      id: 'structures',
      name: 'Gestisci Strutture',
      description: 'Crea e modifica le strutture di prodotto',
      icon: Building,
    },
    {
      id: 'import',
      name: 'Import CSV',
      description: 'Importa varianti da file CSV',
      icon: Upload,
    },
    {
      id: 'manual',
      name: 'Inserimento Manuale',
      description: 'Aggiungi varianti manualmente',
      icon: PlusCircle,
    },
    {
      id: 'view',
      name: 'Visualizza Varianti',
      description: 'Consulta le varianti esistenti',
      icon: Eye,
    },
  ];

  // Load structures from Airtable
  const loadStructures = async () => {
    setLoadingStructures(true);
    try {
      const response = await fetch('/api/product-structures');
      
      if (!response.ok) {
        throw new Error('Failed to load structures');
      }
      
      const result = await response.json();
      setStructures(result.structures || []);
      
      // Set first structure as selected if none selected
      if (!selectedStructure && result.structures.length > 0) {
        setSelectedStructure(result.structures[0].name);
      }
      
      console.log(`[Structures] Loaded ${result.structures.length} structures from Airtable`);
    } catch (error: any) {
      console.error('[Structures] Error loading structures:', error);
      toast.error('Errore nel caricamento strutture');
      
      // Fallback to predefined structures
      setStructures(PREDEFINED_STRUCTURES);
      if (!selectedStructure) {
        setSelectedStructure(PREDEFINED_STRUCTURES[0]?.name || 'Materasso');
      }
    } finally {
      setLoadingStructures(false);
    }
  };

  // Load structures on component mount
  React.useEffect(() => {
    loadStructures();
  }, []);

  // Load existing variants from Airtable
  const loadExistingVariants = async (structure?: string) => {
    setLoadingExisting(true);
    try {
      const params = new URLSearchParams();
      if (structure) {
        params.set('structure', structure);
      }
      
      const response = await fetch(`/api/structure-variants?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to load existing variants');
      }
      
      const result = await response.json();
      setExistingVariants(result.variants || []);
      console.log(`[Variants] Loaded ${result.variants.length} existing variants`);
    } catch (error: any) {
      console.error('[Variants] Error loading existing variants:', error);
      toast.error('Errore nel caricamento varianti esistenti');
    } finally {
      setLoadingExisting(false);
    }
  };

  // Load existing variants when structure changes
  React.useEffect(() => {
    loadExistingVariants(selectedStructure);
  }, [selectedStructure]);

  // Handle CSV file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  // Parse CSV content
  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Expected headers: structure_name,field_id,field_name,code,name,description,price_modifier,cost_modifier,active,posizione
      const expectedHeaders = [
        'structure_name', 'field_id', 'field_name', 'code', 'name', 
        'description', 'price_modifier', 'cost_modifier', 'active', 'posizione'
      ];
      
      if (!expectedHeaders.every(header => headers.includes(header))) {
        toast.error('CSV deve contenere le colonne: ' + expectedHeaders.join(', '));
        return;
      }

      const newVariants: StructureVariant[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const csvVariant = {
          structure_name: values[headers.indexOf('structure_name')] || '',
          field_id: values[headers.indexOf('field_id')] || '',
          field_name: values[headers.indexOf('field_name')] || '',
          code: values[headers.indexOf('code')] || '',
          name: values[headers.indexOf('name')] || '',
          description: values[headers.indexOf('description')] || '',
          price_modifier: parseFloat(values[headers.indexOf('price_modifier')]) || 0,
          cost_modifier: parseFloat(values[headers.indexOf('cost_modifier')]) || 0,
          active: values[headers.indexOf('active')].toLowerCase() === 'true',
          posizione: parseInt(values[headers.indexOf('posizione')]) || undefined,
        };
        
        if (!csvVariant.structure_name || !csvVariant.field_id || !csvVariant.code || !csvVariant.name) {
          continue;
        }
        
        // Parse multiple structures from CSV (support both | and , separators)
        let structureName = csvVariant.structure_name || selectedStructure;
        if (structureName.includes('|')) {
          // Use pipe separator (preferred for CSV)
          structureName = structureName.replace(/\|/g, ',');
        }
        
        // Crea una singola variante per il field_id logico
        const variant: StructureVariant = {
          structure_name: structureName, // Support multiple structures
          field_id: csvVariant.field_id, // Mantieni l'ID logico
          field_name: csvVariant.field_name,
          code: csvVariant.code,
          name: csvVariant.name,
          description: csvVariant.description,
          price_modifier: csvVariant.price_modifier,
          cost_modifier: csvVariant.cost_modifier,
          active: csvVariant.active,
          posizione: csvVariant.posizione,
        };
        newVariants.push(variant);
      }

      setVariants(prev => [...prev, ...newVariants]);
      toast.success(`${newVariants.length} varianti importate con successo!`);
    } catch (error) {
      toast.error('Errore nel parsing del CSV');
      console.error(error);
    }
  };

  // Generate CSV template
  const generateCSVTemplate = () => {
    const headers = [
      'structure_name', 'field_id', 'field_name', 'code', 'name', 
      'description', 'price_modifier', 'cost_modifier', 'active', 'posizione'
    ];
    
    const exampleRows = [
      ['Materasso', 'modello', 'Modello', 'M1', 'Modello Basic', 'Materasso entry level', '0', '0', 'true', '1'],
      ['Materasso', 'modello', 'Modello', 'M2', 'Modello Comfort', 'Materasso medio gamma', '100', '50', 'true', '2'],
      ['Materasso|Letto', 'larghezza', 'Larghezza', '090', 'Larghezza 90cm', 'Condivisa con letto', '0', '0', 'true', '1'],
      ['Materasso|Letto|Rete', 'larghezza', 'Larghezza', '160', 'Larghezza 160cm', 'Condivisa multiple', '150', '75', 'true', '2'],
      ['Materasso', 'taglia', 'Taglia', '0L', 'Taglia Morbida', 'Solo materasso', '0', '0', 'true', '1'],
      ['Letto', 'tipologia', 'Tipologia', 'BL', 'Base Letto', 'Solo letto', '0', '0', 'true', '1'],
    ];

    const csvContent = [headers, ...exampleRows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-varianti-strutturate.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Add variant manually - crea una sola variante per categoria logica
  const handleAddVariant = () => {
    if (!newVariant.field_id || !newVariant.code || !newVariant.name) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    // Get all target structures (current + selected additional ones)
    const targetStructures = [selectedStructure, ...selectedStructuresForVariant];
    
    // Crea una singola variante per tutte le strutture selezionate
    const variant: StructureVariant = {
      structure_name: targetStructures.join(','), // Pass all target structures (comma separated)
      field_id: newVariant.field_id!, // Usa l'ID logico
      field_name: logicalFields.find(f => f.id === newVariant.field_id)?.name || '',
      code: newVariant.code!,
      name: newVariant.name!,
      description: newVariant.description || '',
      price_modifier: newVariant.price_modifier || 0,
      cost_modifier: newVariant.cost_modifier || 0,
      active: newVariant.active ?? true,
      posizione: newVariant.posizione,
    };

    setVariants(prev => [...prev, variant]);
    
    // Reset form
    setNewVariant({
      structure_name: selectedStructure,
      field_id: '',
      code: '',
      name: '',
      price_modifier: 0,
      cost_modifier: 0,
      active: true,
      posizione: undefined,
    });
    setSelectedStructuresForVariant([]); // Reset multi-structure selection

    toast.success('Variante aggiunta!');
  };

  // Delete variant
  const handleDeleteVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    toast.success('Variante eliminata');
  };
  
  // Edit existing variant
  const handleEditVariant = async (variant: StructureVariant) => {
    // Make a copy to edit
    setEditingVariant({ ...variant });
    
    // Load current structures for this variant from Airtable
    try {
      const response = await fetch(`/api/structure-variants/${variant.id}`);
      if (response.ok) {
        const result = await response.json();
        // Parse structures from the variant (could be comma-separated)
        const variantStructures = result.variant?.structure_name?.split(',').map((s: string) => s.trim()) || [];
        // Remove current structure and keep only additional ones
        const additionalStructures = variantStructures.filter((s: string) => s !== selectedStructure);
        setEditingVariantStructures(additionalStructures);
      }
    } catch (error) {
      console.warn('Could not load variant structures:', error);
      setEditingVariantStructures([]);
    }
    
    setShowEditDialog(true);
  };
  
  // Save edited variant
  const handleSaveEditedVariant = async () => {
    if (!editingVariant || !editingVariant.id) {
      toast.error('Nessuna variante da salvare');
      return;
    }
    
    setLoading(true);
    try {
      // Combine current structure with additional selected ones
      const allStructures = [selectedStructure, ...editingVariantStructures];
      
      const response = await fetch(`/api/structure-variants/${editingVariant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: editingVariant.code,
          name: editingVariant.name,
          description: editingVariant.description,
          price_modifier: editingVariant.price_modifier,
          cost_modifier: editingVariant.cost_modifier,
          active: editingVariant.active,
          posizione: editingVariant.posizione,
          structures: allStructures, // Send all target structures
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Variante aggiornata con successo!');
        setShowEditDialog(false);
        setEditingVariant(null);
        setEditingVariantStructures([]); // Reset structures selection
        // Reload existing variants
        await loadExistingVariants(selectedStructure);
      } else {
        throw new Error(result.error || 'Errore nell\'aggiornamento');
      }
    } catch (error: any) {
      console.error('[Edit] Edit variant error:', error);
      toast.error('Errore nell\'aggiornamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Delete existing variant
  const handleDeleteExistingVariant = async (variantId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/structure-variants/${variantId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Variante eliminata con successo!');
        setShowDeleteConfirm(null);
        // Reload existing variants
        await loadExistingVariants(selectedStructure);
      } else {
        throw new Error(result.error || 'Errore nell\'eliminazione');
      }
    } catch (error: any) {
      console.error('❌ Delete variant error:', error);
      toast.error('Errore nell\'eliminazione: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Save all variants to Airtable
  const handleSaveVariants = async () => {
    if (variants.length === 0) {
      toast.error('Nessuna variante da salvare');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Saving variants to Airtable...', variants.length);
      
      const response = await fetch('/api/structure-variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variants }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message);
        
        // Show detailed summary
        if (result.summary) {
          console.log('📊 Import Summary:', result.summary);
          toast.info(`Importate ${result.summary.total_created} varianti con successo rate ${result.summary.success_rate}`);
        }
        
        // Clear the local variants after successful save
        setVariants([]);
      } else {
        throw new Error(result.error || 'Errore nel salvataggio');
      }
    } catch (error: any) {
      console.error('❌ Save variants error:', error);
      toast.error('Errore nel salvataggio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Structure management functions
  const handleCreateNewStructure = () => {
    const newStructure: ProductStructure = {
      id: `struct_${Date.now()}`,
      name: 'Nuova Struttura',
      description: 'Descrizione struttura',
      active: true,
      fields: [{
        id: 'campo1',
        name: 'Campo 1',
        position: 0,
        length: 2,
        placeholder: '##',
        required: true,
        description: 'Primo campo'
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setEditingStructure(newStructure);
    setIsCreatingNew(true);
    setShowStructureDialog(true);
  };

  const handleEditStructure = (structure: ProductStructure) => {
    setEditingStructure({ ...structure });
    setIsCreatingNew(false);
    setShowStructureDialog(true);
  };

  const handleSaveStructure = async () => {
    if (!editingStructure) return;
    
    try {
      const structureData = {
        name: editingStructure.name,
        description: editingStructure.description,
        fields: editingStructure.fields,
        active: editingStructure.active
      };
      
      let response;
      
      if (isCreatingNew) {
        // Create new structure
        response = await fetch('/api/product-structures', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(structureData),
        });
      } else {
        // Update existing structure
        response = await fetch('/api/product-structures', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingStructure.id,
            ...structureData
          }),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        
        // Reload structures from server
        await loadStructures();
        
        setEditingStructure(null);
        setIsCreatingNew(false);
        setShowStructureDialog(false);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error: any) {
      console.error('Error saving structure:', error);
      toast.error('Errore nel salvataggio: ' + error.message);
      // Keep dialog open on error so user can retry
    }
  };

  const handleDeleteStructure = async (structureId: string, structureName: string) => {
    if (structures.length <= 1) {
      toast.error('Deve rimanere almeno una struttura');
      return;
    }
    
    if (!confirm(`Sei sicuro di voler eliminare la struttura "${structureName}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/product-structures?id=${structureId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        
        // Se stiamo cancellando la struttura selezionata, selezioniamo la prima disponibile
        if (selectedStructure === structureName) {
          const remaining = structures.filter(s => s.id !== structureId);
          if (remaining.length > 0) {
            setSelectedStructure(remaining[0].name);
          }
        }
        
        // Reload structures from server
        await loadStructures();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
      
    } catch (error: any) {
      console.error('Error deleting structure:', error);
      toast.error('Errore nell\'eliminazione: ' + error.message);
    }
  };

  const handleAddField = () => {
    if (!editingStructure) return;
    
    const newField: StructureField = {
      id: `campo${editingStructure.fields.length + 1}`,
      name: `Campo ${editingStructure.fields.length + 1}`,
      position: editingStructure.fields.length,
      length: 2,
      placeholder: '##',
      required: false,
      description: ''
    };
    
    setEditingStructure(prev => ({
      ...prev!,
      fields: [...prev!.fields, newField]
    }));
  };

  const handleUpdateField = (fieldIndex: number, updatedField: StructureField) => {
    if (!editingStructure) return;
    
    setEditingStructure(prev => ({
      ...prev!,
      fields: prev!.fields.map((field, index) => 
        index === fieldIndex ? updatedField : field
      )
    }));
  };

  const handleDeleteField = (fieldIndex: number) => {
    if (!editingStructure || editingStructure.fields.length <= 1) {
      toast.error('Deve rimanere almeno un campo');
      return;
    }
    
    setEditingStructure(prev => ({
      ...prev!,
      fields: prev!.fields.filter((_, index) => index !== fieldIndex)
        .map((field, index) => ({ ...field, position: index })) // Reorder positions
    }));
  };

  const handleMoveField = (fieldIndex: number, direction: 'up' | 'down') => {
    if (!editingStructure) return;
    
    const fields = [...editingStructure.fields];
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    
    // Swap fields
    [fields[fieldIndex], fields[targetIndex]] = [fields[targetIndex], fields[fieldIndex]];
    
    // Update positions
    fields.forEach((field, index) => {
      field.position = index;
    });
    
    setEditingStructure(prev => ({ ...prev!, fields }));
  };

  const filteredVariants = variants.filter(v => v.structure_name === selectedStructure);
  // Filter existing variants by the selected structure (now that we have proper linking)
  const filteredExistingVariants = existingVariants.filter(v => v.structure_name === selectedStructure);
  const allVariantsForStructure = [...filteredExistingVariants, ...filteredVariants];
  
  // Raggruppa varianti per categoria logica invece che per campo fisico
  const variantsByLogicalField = allVariantsForStructure.reduce((acc, variant) => {
    // Determina la categoria logica dal field_id fisico
    let logicalFieldId = variant.field_id;
    if (variant.field_id.endsWith('_sx') || variant.field_id.endsWith('_dx')) {
      logicalFieldId = variant.field_id.replace(/_sx$|_dx$/g, '');
    }
    
    // Fallback: se non troviamo corrispondenza per ID, prova per nome
    const matchingLogicalField = logicalFields.find(lf => 
      lf.id === logicalFieldId || 
      lf.name.toLowerCase() === variant.field_name?.toLowerCase()
    );
    
    if (matchingLogicalField) {
      logicalFieldId = matchingLogicalField.id;
    }
    
    console.log('🔍 Debug variante:', {
      variant_field_id: variant.field_id,
      variant_field_name: variant.field_name,
      logical_field_id: logicalFieldId,
      variant_name: variant.name,
      variant_code: variant.code,
      matched_field: matchingLogicalField?.name
    });
    
    if (!acc[logicalFieldId]) acc[logicalFieldId] = [];
    acc[logicalFieldId].push(variant);
    return acc;
  }, {} as Record<string, StructureVariant[]>);
  
  console.log('🔍 Debug logicalFields:', logicalFields.map(f => ({ id: f.id, name: f.name })));
  console.log('🔍 Debug variantsByLogicalField:', Object.keys(variantsByLogicalField));
  console.log('🔍 Debug allVariantsForStructure count:', allVariantsForStructure.length);

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName="Gestione Varianti Strutturate" 
          items={[
            { label: 'Prodotti', href: '/products' },
            { label: 'Varianti Strutturate' }
          ]}
        />

        <div className="px-4 lg:px-6">
          <div className="space-y-6">
            
            {/* Header moderno in stile settings */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <h1 className="text-2xl font-bold tracking-tight">Gestione Varianti</h1>
                </div>
                <p className="text-muted-foreground">
                  Configura strutture e varianti per i prodotti del catalogo
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/products">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Prodotti
                  </Link>
                </Button>
              </div>
            </div>

            {/* Structure Selection */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium">Struttura attiva:</Label>
                  <Select value={selectedStructure} onValueChange={setSelectedStructure}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {structures.map((structure) => (
                        <SelectItem key={structure.id || structure.name} value={structure.name}>
                          {structure.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {currentStructure && (
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Database className="h-3 w-3" />
                      <span>{currentStructure.fields.length} campi</span>
                    </div>
                    <span>•</span>
                    <span>{filteredExistingVariants.length} varianti</span>
                    {filteredVariants.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-orange-600 dark:text-orange-400">{filteredVariants.length} da salvare</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {loadingExisting && (
                <Badge variant="secondary" className="text-xs animate-pulse">Caricamento...</Badge>
              )}
            </div>

            {/* Layout principale con sidebar */}
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
              {/* Sidebar Navigation */}
              <aside className="lg:w-1/5 lg:flex-shrink-0">
                <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                  {navigationSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${activeSection === section.id
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground'
                        }`}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span className="hidden lg:block">{section.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* Content Area */}
              <div className="flex-1 lg:w-4/5 min-w-0">
                <div className="space-y-6">
                  {/* Sezione: Gestione Strutture */}
                  {activeSection === 'structures' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Strutture disponibili</h4>
                        </div>
                        <Button onClick={handleCreateNewStructure}>
                          <Plus className="mr-2 h-4 w-4" />
                          Nuova Struttura
                        </Button>
                      </div>
                      
                      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {structures.map((structure) => (
                          <Card key={structure.id || structure.name} className="relative hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-lg">{structure.name}</CardTitle>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {structure.description}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditStructure(structure)}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteStructure(structure.id, structure.name)}
                                    disabled={structures.length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Campi:</span>
                                  <Badge variant="secondary">{structure.fields.length}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {structure.fields.slice(0, 4).map((field) => (
                                    <Badge key={field.id} variant="outline" className="text-xs">
                                      {field.name}
                                    </Badge>
                                  ))}
                                  {structure.fields.length > 4 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{structure.fields.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sezione: Import CSV */}
                  {activeSection === 'import' && (
                    <div className="space-y-6">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          Il CSV deve contenere le colonne: structure_name, field_id, field_name, code, name, description, price_modifier, cost_modifier, active, posizione
                        </AlertDescription>
                      </Alert>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Card className="p-6">
                          <div className="flex flex-col space-y-4">
                            <div className="flex items-center space-x-2">
                              <Download className="h-5 w-5 text-muted-foreground" />
                              <h4 className="font-medium">Template CSV</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Scarica un template con esempi per iniziare rapidamente.
                            </p>
                            <Button variant="outline" onClick={generateCSVTemplate} className="w-full">
                              <Download className="mr-2 h-4 w-4" />
                              Scarica Template CSV
                            </Button>
                          </div>
                        </Card>

                        <Card className="p-6">
                          <div className="flex flex-col space-y-4">
                            <div className="flex items-center space-x-2">
                              <Upload className="h-5 w-5 text-muted-foreground" />
                              <h4 className="font-medium">Carica File CSV</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Seleziona il file CSV da importare nel sistema.
                            </p>
                            <Input
                              type="file"
                              accept=".csv"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                              <Upload className="mr-2 h-4 w-4" />
                              Seleziona File CSV
                            </Button>
                          </div>
                        </Card>
                      </div>

                      <Card className="p-6">
                        <div className="space-y-4">
                          <h4 className="font-medium">Esempio di righe CSV</h4>
                          <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto border">
{`Materasso,modello,Modello,M1,Modello Basic,Entry level,0,0,true,1
Materasso|Letto,larghezza,Larghezza,160,Larghezza 160cm,Condivisa,150,75,true,2
Letto,tipologia,Tipologia,BL,Base Letto,Solo letto,0,0,true,1`}
                          </pre>
                          <p className="text-sm text-muted-foreground">
                            <strong>Suggerimento:</strong> Usa "|" per strutture multiple (es: "Materasso|Letto" per varianti condivise)
                          </p>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Sezione: Inserimento Manuale */}
                  {activeSection === 'manual' && (
                    <div className="space-y-6">
                      <Card className="p-6">
                        <div className="space-y-6">
                          {/* Informazioni di base */}
                          <div className="space-y-4">
                            <h4 className="font-medium">Informazioni Base</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="field">Campo *</Label>
                                <Select
                                  value={newVariant.field_id || ''}
                                  onValueChange={(value) => setNewVariant(prev => ({ ...prev, field_id: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona categoria" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {logicalFields.map((field) => (
                                      <SelectItem key={field.id} value={field.id}>
                                        {field.name}
                                        {field.physicalFields.length > 1 && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            ({field.physicalFields.length} campi)
                                          </span>
                                        )}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="code">Codice *</Label>
                                <Input
                                  id="code"
                                  value={newVariant.code || ''}
                                  onChange={(e) => setNewVariant(prev => ({ ...prev, code: e.target.value }))}
                                  placeholder="es. M3, 160, T4"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="name">Nome *</Label>
                              <Input
                                id="name"
                                value={newVariant.name || ''}
                                onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="es. Modello Premium, Larghezza 160cm"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="description">Descrizione</Label>
                              <Textarea
                                id="description"
                                value={newVariant.description || ''}
                                onChange={(e) => setNewVariant(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descrizione opzionale della variante"
                                rows={2}
                              />
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="space-y-4">
                            <h4 className="font-medium">Modificatori Prezzo</h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="price-mod">Modificatore Prezzo (€)</Label>
                                <Input
                                  id="price-mod"
                                  type="number"
                                  step="0.01"
                                  value={newVariant.price_modifier || 0}
                                  onChange={(e) => setNewVariant(prev => ({ ...prev, price_modifier: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="cost-mod">Modificatore Costo (€)</Label>
                                <Input
                                  id="cost-mod"
                                  type="number"
                                  step="0.01"
                                  value={newVariant.cost_modifier || 0}
                                  onChange={(e) => setNewVariant(prev => ({ ...prev, cost_modifier: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="posizione">Posizione</Label>
                                <Input
                                  id="posizione"
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={newVariant.posizione || ''}
                                  onChange={(e) => setNewVariant(prev => ({ ...prev, posizione: parseInt(e.target.value) || undefined }))}
                                  placeholder="1, 2, 3..."
                                />
                                <p className="text-xs text-muted-foreground">
                                  Ordine di visualizzazione
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Strutture compatibili */}
                          {structures.filter(s => s.name !== selectedStructure).length > 0 && (
                            <div className="space-y-4">
                              <h4 className="font-medium">Strutture Compatibili</h4>
                              <p className="text-sm text-muted-foreground">
                                Seleziona strutture aggiuntive se questa variante è condivisa. 
                                Se non selezioni nulla, sarà disponibile solo per "{selectedStructure}".
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {structures
                                  .filter(s => s.name !== selectedStructure)
                                  .map((structure) => (
                                  <div key={structure.id} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`struct-${structure.id}`}
                                      checked={selectedStructuresForVariant.includes(structure.name)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedStructuresForVariant(prev => [...prev, structure.name]);
                                        } else {
                                          setSelectedStructuresForVariant(prev => prev.filter(s => s !== structure.name));
                                        }
                                      }}
                                      className="rounded border-gray-300"
                                    />
                                    <label htmlFor={`struct-${structure.id}`} className="text-sm">
                                      {structure.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              {selectedStructuresForVariant.length > 0 && (
                                <div className="text-sm text-blue-600 dark:text-blue-400">
                                  Variante sarà disponibile per: {selectedStructure}, {selectedStructuresForVariant.join(', ')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stato e submit */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="active"
                                checked={newVariant.active ?? true}
                                onCheckedChange={(checked) => setNewVariant(prev => ({ ...prev, active: checked }))}
                              />
                              <Label htmlFor="active">Variante attiva</Label>
                            </div>

                            <Button onClick={handleAddVariant} className="w-full">
                              <Plus className="mr-2 h-4 w-4" />
                              Aggiungi Variante
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Sezione: Visualizza Varianti */}
                  {activeSection === 'view' && (
                    <div className="space-y-6">
                      {currentStructure ? (
                        logicalFields.map((logicalField) => {
                          const fieldVariants = variantsByLogicalField[logicalField.id] || [];
                          
                          // Raggruppa varianti per codice per mostrare una sola volta
                          const variantsByCode = fieldVariants.reduce((acc, variant) => {
                            if (!acc[variant.code]) {
                              acc[variant.code] = variant; // Prendi la prima occorrenza
                            }
                            return acc;
                          }, {} as Record<string, StructureVariant>);
                          
                          const uniqueVariants = Object.values(variantsByCode)
                            // Sort by posizione field
                            .sort((a, b) => {
                              const posA = a.posizione || 999; // Put variants without position at the end
                              const posB = b.posizione || 999;
                              return posA - posB;
                            });
                          
                          return (
                            <Card key={logicalField.id}>
                              <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span>{logicalField.name}</span>
                                    <Badge className="ml-2" variant="outline">
                                      {uniqueVariants.length} varianti
                                    </Badge>
                                    {logicalField.physicalFields.length > 1 && (
                                      <Badge className="ml-2" variant="secondary">
                                        {logicalField.physicalFields.length} campi fisici
                                      </Badge>
                                    )}
                                  </div>
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {uniqueVariants.length > 0 ? (
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {uniqueVariants.map((variant, index) => {
                                      const isExisting = filteredExistingVariants.some(ev => 
                                        ev.code === variant.code && ev.field_id === variant.field_id
                                      );
                                      const isNew = !isExisting;
                                      
                                      return (
                                      <div
                                        key={`${variant.field_id}-${variant.code}-${index}`}
                                        className={`border rounded-lg p-3 hover:shadow-sm transition-shadow ${
                                          isNew ? 'border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/30' : 'border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div>
                                            <div className="font-medium text-sm">{variant.name}</div>
                                            <div className="flex items-center space-x-2 mt-1">
                                              <Badge variant="secondary" className="text-xs">
                                                {variant.code}
                                              </Badge>
                                              {variant.posizione && (
                                                <Badge variant="outline" className="text-xs">
                                                  Pos. {variant.posizione}
                                                </Badge>
                                              )}
                                              {isNew && (
                                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                  Nuovo
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Badge className={variant.active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}>
                                              {variant.active ? 'Attivo' : 'Inattivo'}
                                            </Badge>
                                            {isNew && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteVariant(variants.indexOf(variant))}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            )}
                                            {isExisting && variant.id && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleEditVariant(variant)}
                                                  title="Modifica variante"
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <AlertDialog open={showDeleteConfirm === variant.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                                                  <AlertDialogTrigger asChild>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => setShowDeleteConfirm(variant.id)}
                                                      title="Elimina variante"
                                                    >
                                                      <Trash2 className="h-3 w-3 text-red-500" />
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Sei sicuro di voler eliminare la variante "{variant.name}" ({variant.code})?
                                                        Questa azione non può essere annullata.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                      <AlertDialogAction 
                                                        onClick={() => variant.id && handleDeleteExistingVariant(variant.id)}
                                                        className="bg-red-600 hover:bg-red-700"
                                                      >
                                                        Elimina
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {variant.description && (
                                          <p className="text-xs text-muted-foreground mb-2">
                                            {variant.description}
                                          </p>
                                        )}
                                        
                                        {(variant.price_modifier !== 0 || variant.cost_modifier !== 0) && (
                                          <div className="text-xs space-y-1">
                                            {variant.price_modifier !== 0 && (
                                              <div className={variant.price_modifier >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                Prezzo: {variant.price_modifier >= 0 ? '+' : ''}€{variant.price_modifier}
                                              </div>
                                            )}
                                            {variant.cost_modifier !== 0 && (
                                              <div className="text-muted-foreground">
                                                Costo: {variant.cost_modifier >= 0 ? '+' : ''}€{variant.cost_modifier}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                                    <p>Nessuna variante definita per {logicalField.name}</p>
                                    <p className="text-xs">Usa l'import CSV o l'inserimento manuale per aggiungere varianti</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Database className="mx-auto h-12 w-12 mb-4" />
                          <p className="text-lg font-medium">Nessuna struttura selezionata</p>
                          <p className="text-sm">Seleziona una struttura per visualizzare le varianti</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Section */}
            {variants.length > 0 && (
              <Card>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="font-semibold">
                      {variants.length} varianti pronte per il salvataggio
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Le varianti verranno salvate nel database e saranno disponibili nel configuratore
                    </p>
                  </div>
                  
                  <Button onClick={handleSaveVariants} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salva Varianti
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Structure Edit Dialog */}
      <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
        <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              {isCreatingNew ? 'Crea Nuova Struttura' : 'Modifica Struttura'}
            </DialogTitle>
            <DialogDescription>
              {isCreatingNew ? 'Configura una nuova struttura prodotto' : 'Modifica la configurazione della struttura esistente'}
            </DialogDescription>
          </DialogHeader>
          
          {editingStructure && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Basic Info Section */}
              <div className="space-y-4 pb-4 border-b">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="struct-name" className="font-medium">Nome Struttura *</Label>
                    <Input
                      id="struct-name"
                      value={editingStructure.name}
                      onChange={(e) => setEditingStructure(prev => ({
                        ...prev!,
                        name: e.target.value
                      }))}
                      placeholder="es. Materasso, Rete, Cuscino"
                      className="font-medium"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-medium">Stato</Label>
                    <div className="flex items-center space-x-3 pt-1">
                      <Switch
                        id="struct-active"
                        checked={editingStructure.active}
                        onCheckedChange={(checked) => setEditingStructure(prev => ({
                          ...prev!,
                          active: checked
                        }))}
                      />
                      <Label htmlFor="struct-active" className="text-sm">
                        {editingStructure.active ? 'Struttura attiva' : 'Struttura inattiva'}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="struct-desc" className="font-medium">Descrizione</Label>
                  <Textarea
                    id="struct-desc"
                    value={editingStructure.description || ''}
                    onChange={(e) => setEditingStructure(prev => ({
                      ...prev!,
                      description: e.target.value
                    }))}
                    placeholder="Descrizione della struttura e del suo utilizzo"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Fields Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-lg font-semibold">Campi Struttura</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Definisci i campi che compongono il codice prodotto ({editingStructure.fields.length} campi configurati)
                    </p>
                  </div>
                  <Button size="sm" onClick={handleAddField} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi Campo
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {editingStructure.fields.map((field, index) => (
                    <Card key={index} className="p-4 shadow-sm">
                      <div className="space-y-4">
                        {/* First Row: Main field properties */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-3">
                            <Label className="text-xs font-medium text-muted-foreground">ID Campo *</Label>
                            <Input
                              value={field.id}
                              onChange={(e) => handleUpdateField(index, {
                                ...field,
                                id: e.target.value
                              })}
                              placeholder="es. modello, larghezza"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="md:col-span-4">
                            <Label className="text-xs font-medium text-muted-foreground">Nome Campo *</Label>
                            <Input
                              value={field.name}
                              onChange={(e) => handleUpdateField(index, {
                                ...field,
                                name: e.target.value
                              })}
                              placeholder="es. Modello, Larghezza"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label className="text-xs font-medium text-muted-foreground">Lunghezza</Label>
                            <Input
                              type="number"
                              value={field.length}
                              onChange={(e) => handleUpdateField(index, {
                                ...field,
                                length: parseInt(e.target.value) || 2
                              })}
                              min="1"
                              max="10"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label className="text-xs font-medium text-muted-foreground">Placeholder</Label>
                            <Input
                              value={field.placeholder}
                              onChange={(e) => handleUpdateField(index, {
                                ...field,
                                placeholder: e.target.value
                              })}
                              placeholder="##"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="md:col-span-1 flex flex-col items-center">
                            <Label className="text-xs font-medium text-muted-foreground mb-2">Richiesto</Label>
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => handleUpdateField(index, {
                                ...field,
                                required: checked
                              })}
                            />
                          </div>
                        </div>
                        
                        {/* Second Row: Description and Actions */}
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                          <div className="flex-1">
                            <Label className="text-xs font-medium text-muted-foreground">Descrizione</Label>
                            <Input
                              value={field.description || ''}
                              onChange={(e) => handleUpdateField(index, {
                                ...field,
                                description: e.target.value
                              })}
                              placeholder="Descrizione del campo (opzionale)"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveField(index, 'up')}
                              disabled={index === 0}
                              title="Sposta in alto"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMoveField(index, 'down')}
                              disabled={index === editingStructure.fields.length - 1}
                              title="Sposta in basso"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteField(index)}
                              disabled={editingStructure.fields.length <= 1}
                              title="Elimina campo"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStructureDialog(false);
                setEditingStructure(null);
                setIsCreatingNew(false);
              }}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSaveStructure}
              disabled={!editingStructure?.name?.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {isCreatingNew ? 'Crea Struttura' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Variant Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Variante</DialogTitle>
            <DialogDescription>
              Modifica i dettagli della variante selezionata
            </DialogDescription>
          </DialogHeader>
          {editingVariant && (
            <div className="space-y-6 py-4">
              {/* Basic Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Codice *</Label>
                  <Input
                    id="edit-code"
                    value={editingVariant.code}
                    onChange={(e) => setEditingVariant(prev => prev ? { ...prev, code: e.target.value } : null)}
                    placeholder="es. M3, 160, T4"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input
                    id="edit-name"
                    value={editingVariant.name}
                    onChange={(e) => setEditingVariant(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="es. Modello Premium, Larghezza 160cm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrizione</Label>
                  <Textarea
                    id="edit-description"
                    value={editingVariant.description || ''}
                    onChange={(e) => setEditingVariant(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Descrizione opzionale della variante"
                    rows={2}
                  />
                </div>
              </div>
              
              {/* Price & Position */}
              <div className="border-t pt-4">
                <Label className="text-base font-medium mb-3 block">Prezzi e Posizione</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Prezzo (€)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={editingVariant.price_modifier || 0}
                      onChange={(e) => setEditingVariant(prev => prev ? { ...prev, price_modifier: parseFloat(e.target.value) || 0 } : null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-cost">Costo (€)</Label>
                    <Input
                      id="edit-cost"
                      type="number"
                      step="0.01"
                      value={editingVariant.cost_modifier || 0}
                      onChange={(e) => setEditingVariant(prev => prev ? { ...prev, cost_modifier: parseFloat(e.target.value) || 0 } : null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-position">Posizione</Label>
                    <Input
                      id="edit-position"
                      type="number"
                      min="1"
                      max="99"
                      value={editingVariant.posizione || ''}
                      onChange={(e) => setEditingVariant(prev => prev ? { ...prev, posizione: parseInt(e.target.value) || undefined } : null)}
                      placeholder="1, 2, 3..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Ordine di visualizzazione (opzionale)
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Active Toggle */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="edit-active"
                    checked={editingVariant.active}
                    onCheckedChange={(checked) => setEditingVariant(prev => prev ? { ...prev, active: checked } : null)}
                  />
                  <Label htmlFor="edit-active">Variante attiva</Label>
                </div>
              </div>
              
              {/* Multiple Structures Selection */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-medium">Strutture Compatibili</Label>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground mb-3">
                    Variante attualmente disponibile per: <strong>"{selectedStructure}"</strong>
                    {editingVariantStructures.length > 0 && (
                      <span>, <strong>{editingVariantStructures.join(', ')}</strong></span>
                    )}
                  </p>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Aggiungi ad altre strutture:</Label>
                    <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                      {structures
                        .filter(s => s.name !== selectedStructure)
                        .map((structure) => (
                          <div key={structure.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/30">
                            <input
                              type="checkbox"
                              id={`edit-struct-${structure.id}`}
                              checked={editingVariantStructures.includes(structure.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditingVariantStructures(prev => [...prev, structure.name]);
                                } else {
                                  setEditingVariantStructures(prev => prev.filter(s => s !== structure.name));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`edit-struct-${structure.id}`} className="text-sm font-medium cursor-pointer flex-1">
                              {structure.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingVariantStructures([]); // Reset on cancel
            }}>
              Annulla
            </Button>
            <Button onClick={handleSaveEditedVariant} disabled={loading}>
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayoutCustom>
  );
}
