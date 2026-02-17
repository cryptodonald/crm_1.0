'use client';

import { useState, useCallback } from 'react';
import { Upload, FileType, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ScanUploaderProps {
  clienteId: string;
  initialGender?: 'male' | 'female' | 'neutral';
  initialAge?: number;
  onUploadComplete: (result: {
    body_scan_id: string;
    phenotypes: any;
    glb_url: string;
    error_mm: number;
  }) => void;
  onError?: (error: string) => void;
}

export function ScanUploader({
  clienteId,
  initialGender = 'neutral',
  initialAge = 40,
  onUploadComplete,
  onError,
}: ScanUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const acceptedFormats = ['.obj', '.ply', '.xyz', '.txt', '.stl'];
  // Next.js 16 limit for formData() parsing
  const maxSizeMB = 10;

  const validateFile = (file: File): string | null => {
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File troppo grande (${sizeMB.toFixed(1)}MB). Max ${maxSizeMB}MB`;
    }

    // Check file extension
    const filename = file.name.toLowerCase();
    const hasValidExt = acceptedFormats.some(ext => filename.endsWith(ext));
    if (!hasValidExt) {
      return `Formato non supportato. Formati accettati: ${acceptedFormats.join(', ')}`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);
    setStatus('Caricamento file...');

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cliente_id', clienteId);
      formData.append('initial_gender', initialGender);
      formData.append('initial_age_years', initialAge.toString());

      setProgress(10);
      setStatus('Parsing mesh 3D...');

      // Upload to API
      const response = await fetch('/api/scan/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload fallito');
      }

      setStatus('Fitting ANNY in corso...');
      setProgress(70);

      const result = await response.json();

      setProgress(100);
      setStatus('Completato!');
      setSuccess(true);

      // Callback with result
      onUploadComplete(result);

      // Reset after 2 seconds
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setStatus('');
        setSuccess(false);
      }, 2000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMsg);
      setUploading(false);
      setProgress(0);
      setStatus('');
      
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const handleFileInput = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    uploadFile(file);
  }, [clienteId, initialGender, initialAge]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    handleFileInput(file);
  }, [handleFileInput]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    handleFileInput(file);
  }, [handleFileInput]);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          id="scan-file-input"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
            {success ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <Upload className="h-8 w-8 text-gray-600" />
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-900">
              {uploading ? status : 'Trascina il file di scansione 3D'}
            </p>
            <p className="text-sm text-gray-500">
              oppure clicca per selezionare
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FileType className="h-4 w-4" />
            <span>Formati: {acceptedFormats.join(', ')} • Max {maxSizeMB}MB</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-600 text-center">{status}</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Scansione 3D caricata con successo!
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-medium">Come ottenere la scansione 3D:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Apri un'app di scansione 3D sull'iPhone (es. Scandy Pro, Heges, Polycam)</li>
          <li>Scansiona il cliente (richiede circa 15-30 secondi)</li>
          <li>Esporta il modello in formato .OBJ o .PLY</li>
          <li>Carica il file qui tramite AirDrop, email o condivisione diretta</li>
        </ol>
      </div>
    </div>
  );
}
