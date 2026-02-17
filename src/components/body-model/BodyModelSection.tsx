'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanUploader } from './ScanUploader';
import { GLBViewer } from './GLBViewer';
import { User, ScanLine } from 'lucide-react';

interface BodyModelSectionProps {
  leadId: string;
  leadName?: string;
}

export function BodyModelSection({ leadId, leadName }: BodyModelSectionProps) {
  const [manualData, setManualData] = useState({
    gender: 'male' as 'male' | 'female' | 'neutral',
    age_years: 40,
    height_cm: 170,
    weight_kg: 70,
  });

  const [generatedModel, setGeneratedModel] = useState<{
    glb_url: string;
    phenotypes: any;
    source: 'manual' | 'scan';
    error_mm?: number;
  } | null>(null);

  const [generating, setGenerating] = useState(false);

  const handleGenerateManual = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/body-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate model');
      }

      // Response is binary GLB, not JSON
      const glbBlob = await response.blob();
      const glbUrl = URL.createObjectURL(glbBlob);
      
      setGeneratedModel({
        glb_url: glbUrl,
        phenotypes: manualData, // Store input params as phenotypes
        source: 'manual',
      });
    } catch (error) {
      console.error('Generate error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleScanComplete = (result: {
    body_scan_id: string;
    phenotypes: any;
    glb_url: string;
    error_mm: number;
  }) => {
    setGeneratedModel({
      glb_url: result.glb_url,
      phenotypes: result.phenotypes,
      source: 'scan',
      error_mm: result.error_mm,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modello 3D Corporeo</h2>
          <p className="text-sm text-muted-foreground">
            Genera un modello 3D del cliente per analisi posturale
          </p>
        </div>
        {generatedModel && (
<Badge variant={generatedModel.source === 'scan' ? 'primary' : 'secondary'}>
            {generatedModel.source === 'scan' ? (
              <>
                <ScanLine className="h-3 w-3 mr-1" />
                Da Scansione 3D
              </>
            ) : (
              <>
                <User className="h-3 w-3 mr-1" />
                Inserimento Manuale
              </>
            )}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">
            <User className="h-4 w-4 mr-2" />
            Inserimento Manuale
          </TabsTrigger>
          <TabsTrigger value="scan">
            <ScanLine className="h-4 w-4 mr-2" />
            Scansione 3D
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dati Antropometrici</CardTitle>
              <CardDescription>
                Inserisci i parametri fisici del cliente per generare il modello 3D
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Genere</Label>
                  <Select
                    value={manualData.gender}
                    onValueChange={(value) =>
                      setManualData({ ...manualData, gender: value as typeof manualData.gender })
                    }
                  >
                    <SelectTrigger id="gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Maschio</SelectItem>
                      <SelectItem value="female">Femmina</SelectItem>
                      <SelectItem value="neutral">Neutrale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Età (anni)</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="100"
                    value={manualData.age_years}
                    onChange={(e) =>
                      setManualData({ ...manualData, age_years: parseInt(e.target.value) || 40 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Altezza (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="140"
                    max="220"
                    value={manualData.height_cm}
                    onChange={(e) =>
                      setManualData({ ...manualData, height_cm: parseInt(e.target.value) || 170 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="40"
                    max="200"
                    value={manualData.weight_kg}
                    onChange={(e) =>
                      setManualData({ ...manualData, weight_kg: parseInt(e.target.value) || 70 })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateManual}
                disabled={generating}
                className="w-full"
              >
                {generating ? 'Generazione in corso...' : 'Genera Modello 3D'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Carica Scansione 3D</CardTitle>
              <CardDescription>
                Carica un file di scansione 3D del cliente da iPhone o app dedicate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScanUploader
                clienteId={leadId}
                initialGender={manualData.gender}
                initialAge={manualData.age_years}
                onUploadComplete={handleScanComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 3D Model Viewer */}
      {generatedModel && (
        <Card>
          <CardHeader>
            <CardTitle>Modello 3D Generato</CardTitle>
            <CardDescription>
              {generatedModel.source === 'scan' && generatedModel.error_mm && (
                <span>Errore RMS: {generatedModel.error_mm.toFixed(1)}mm</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GLBViewer url={generatedModel.glb_url} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
