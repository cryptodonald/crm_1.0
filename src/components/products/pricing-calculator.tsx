'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, DollarSign, Percent, Calculator, Info, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingCalculatorProps {
  prezzo?: number;
  costo?: number;
  margine?: number;
  onPriceChange: (price: number | undefined) => void;
  onCostChange: (cost: number | undefined) => void;
  errors?: {
    prezzo?: string;
    costo?: string;
  };
}

// Versione con card (esistente)
export function PricingCalculator({ 
  prezzo, 
  costo, 
  margine, 
  onPriceChange,
  onCostChange,
  errors 
}: PricingCalculatorProps) {
  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return '';
    return value.toString();
  };

  const getMarginColor = (margin?: number) => {
    if (!margin || margin === 0) return 'text-muted-foreground';
    if (margin < 20) return 'text-red-600';
    if (margin < 40) return 'text-gray-600';
    return 'text-green-600';
  };

  const getMarginBadge = (margin?: number) => {
    if (!margin || margin === 0) return { text: 'N/A', variant: 'outline' as const };
    if (margin < 20) return { text: 'Basso', variant: 'destructive' as const };
    if (margin < 40) return { text: 'Medio', variant: 'secondary' as const };
    return { text: 'Buono', variant: 'default' as const };
  };

  const handlePriceChange = (value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    if (numValue !== undefined && !isNaN(numValue) && numValue >= 0) {
      onPriceChange(numValue);
    } else if (value === '') {
      onPriceChange(undefined);
    }
  };

  const handleCostChange = (value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    if (numValue !== undefined && !isNaN(numValue) && numValue >= 0) {
      onCostChange(numValue);
    } else if (value === '') {
      onCostChange(undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <TrendingUp className="mr-2 h-4 w-4" />
          Riepilogo Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Prezzo */}
        <div className="space-y-2">
          <Label htmlFor="prezzo-sidebar">Prezzo (€)</Label>
          <Input
            id="prezzo-sidebar"
            type="number"
            min="0"
            step="0.01"
            value={formatCurrency(prezzo)}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0.00"
            className={cn(
              errors?.prezzo ? 'border-red-500' : ''
            )}
          />
          {errors?.prezzo && (
            <p className="text-sm text-red-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {errors.prezzo}
            </p>
          )}
        </div>

        {/* Input Costo */}
        <div className="space-y-2">
          <Label htmlFor="costo-sidebar">Costo (€)</Label>
          <Input
            id="costo-sidebar"
            type="number"
            min="0"
            step="0.01"
            value={formatCurrency(costo)}
            onChange={(e) => handleCostChange(e.target.value)}
            placeholder="0.00"
            className={cn(
              errors?.costo ? 'border-red-500' : ''
            )}
          />
          {errors?.costo && (
            <p className="text-sm text-red-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {errors.costo}
            </p>
          )}
        </div>

        {/* Margine Calcolato */}
        {prezzo !== undefined && costo !== undefined && prezzo > 0 && costo >= 0 ? (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Percent className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Margine</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('font-bold text-lg', getMarginColor(margine))}>
                  {margine?.toFixed(1) || '0.0'}%
                </span>
                <Badge variant={getMarginBadge(margine).variant}>
                  {getMarginBadge(margine).text}
                </Badge>
              </div>
            </div>
            
            <div className="bg-muted/50 p-2 rounded text-center">
              <span className="text-sm text-muted-foreground">Profitto: </span>
              <span className="font-medium text-green-600">
                €{((prezzo || 0) - (costo || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground border-t">
            <Percent className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Inserisci prezzo e costo per calcolare il margine</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Versione semplificata senza card - stile coerente con form
export function PricingCalculatorSimple({ 
  prezzo, 
  costo, 
  margine, 
  onPriceChange,
  onCostChange,
  errors 
}: PricingCalculatorProps) {
  const [margineTarget, setMargineTarget] = useState<number>(75);
  const [tasseImportazione, setTasseImportazione] = useState<number>(17);

  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return '';
    return value.toString();
  };

  // Calcola costo effettivo includendo tasse
  const calcolaCostoEffettivo = (costoBase?: number, tasse?: number): number | undefined => {
    if (!costoBase || costoBase <= 0) return costoBase;
    if (!tasse || tasse <= 0) return costoBase;
    return costoBase + (costoBase * tasse / 100);
  };

  const costoEffettivo = calcolaCostoEffettivo(costo, tasseImportazione);

  // Calcola margine basato su costo effettivo 
  const calcolaMargineEffettivo = (prezzoVendita?: number, costoConTasse?: number): number | undefined => {
    if (!prezzoVendita || !costoConTasse || prezzoVendita <= 0 || costoConTasse < 0) return undefined;
    if (prezzoVendita <= costoConTasse) return 0;
    return ((prezzoVendita - costoConTasse) / prezzoVendita) * 100;
  };

  const margineEffettivo = calcolaMargineEffettivo(prezzo, costoEffettivo);

  // Calcola prezzo consigliato basato su costo effettivo e margine target
  const calcolaPrezzoConsigliato = (costoConTasse?: number, margineDesiderato?: number): number | undefined => {
    if (!costoConTasse || !margineDesiderato || costoConTasse <= 0 || margineDesiderato <= 0) return undefined;
    return costoConTasse / (1 - margineDesiderato / 100);
  };

  const prezzoConsigliato = calcolaPrezzoConsigliato(costoEffettivo, margineTarget);

  // Logica badge margine
  const getMarginBadge = (margin?: number) => {
    if (!margin || margin === 0) return { text: 'N/A', variant: 'outline' as const };
    if (margin < 0) return { text: 'Perdita', variant: 'destructive' as const };
    if (margin >= margineTarget) return { text: 'Buono', variant: 'default' as const };
    if (margin >= (margineTarget - 10)) return { text: 'Medio', variant: 'secondary' as const };
    return { text: 'Basso', variant: 'destructive' as const };
  };

  const handlePriceChange = (value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    if (numValue !== undefined && !isNaN(numValue) && numValue >= 0) {
      onPriceChange(numValue);
    } else if (value === '') {
      onPriceChange(undefined);
    }
  };

  const handleCostChange = (value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    if (numValue !== undefined && !isNaN(numValue) && numValue >= 0) {
      onCostChange(numValue);
    } else if (value === '') {
      onCostChange(undefined);
    }
  };

  const applicaPrezzoConsigliato = () => {
    if (prezzoConsigliato) {
      onPriceChange(parseFloat(prezzoConsigliato.toFixed(2)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Configurazione - stile coerente con altre sezioni */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-muted">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Configurazione</h4>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="margine-target">Margine Obiettivo (%)</Label>
            <Input
              id="margine-target"
              type="number"
              min="0"
              max="95"
              step="1"
              value={margineTarget}
              onChange={(e) => setMargineTarget(parseFloat(e.target.value) || 75)}
              placeholder="75"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tasse-import">Tasse Importazione (%) *</Label>
            <Input
              id="tasse-import"
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={tasseImportazione}
              onChange={(e) => setTasseImportazione(parseFloat(e.target.value) || 17)}
              placeholder="17"
            />
            <p className="text-xs text-muted-foreground">San Marino: 17%</p>
          </div>
        </div>
      </div>

      {/* Input Prezzi - stile coerente */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-muted">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prezzi</h4>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prezzo">Prezzo Vendita (€) *</Label>
            <Input
              id="prezzo"
              type="number"
              min="0"
              step="0.01"
              value={formatCurrency(prezzo)}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.00"
              className={errors?.prezzo ? 'border-red-500' : ''}
            />
            {prezzoConsigliato && (
              <p className="text-xs text-muted-foreground cursor-pointer" onClick={applicaPrezzoConsigliato}>
                Consigliato: €{prezzoConsigliato.toFixed(2)}
              </p>
            )}
            {errors?.prezzo && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {errors.prezzo}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="costo">Costo Base (€) *</Label>
            <Input
              id="costo"
              type="number"
              min="0"
              step="0.01"
              value={formatCurrency(costo)}
              onChange={(e) => handleCostChange(e.target.value)}
              placeholder="0.00"
              className={errors?.costo ? 'border-red-500' : ''}
            />
            {costoEffettivo && costo && costoEffettivo !== costo && (
              <p className="text-xs text-muted-foreground">
                Costo effettivo: €{costoEffettivo.toFixed(2)} (incluse tasse {tasseImportazione}%)
              </p>
            )}
            {errors?.costo && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {errors.costo}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Riepilogo Calcoli */}
      {prezzo !== undefined && costo !== undefined && prezzo > 0 && costo >= 0 ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-muted">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riepilogo</h4>
          </div>
          
          <div className="grid gap-4 text-sm">
            <div className="grid grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Prezzo Vendita</p>
                <p className="font-semibold">€{prezzo.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Costo Base</p>
                <p className="font-semibold">€{costo.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Costo + Tasse</p>
                <p className="font-semibold">€{costoEffettivo?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Profitto Netto</p>
                <p className={cn('font-semibold', (prezzo - (costoEffettivo || 0)) >= 0 ? 'text-green-600' : 'text-red-600')}>
                  €{(prezzo - (costoEffettivo || 0)).toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <span className="text-sm font-medium">Margine Effettivo:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{margineEffettivo?.toFixed(1) || '0.0'}%</span>
                <Badge variant={getMarginBadge(margineEffettivo).variant}>
                  {getMarginBadge(margineEffettivo).text}
                </Badge>
              </div>
            </div>
          </div>

          {margineEffettivo !== undefined && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {margineEffettivo >= margineTarget 
                  ? `Margine superiore all'obiettivo del ${margineTarget}%. Ottimo risultato!`
                  : margineEffettivo >= (margineTarget - 10)
                  ? `Margine vicino all'obiettivo del ${margineTarget}%. Considerare un aggiustamento.`
                  : `Margine sotto l'obiettivo del ${margineTarget}%. Prezzo consigliato: €${prezzoConsigliato?.toFixed(2) || '0.00'}`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Percent className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Inserisci prezzo e costo per calcolare il margine</p>
        </div>
      )}
    </div>
  );
}
