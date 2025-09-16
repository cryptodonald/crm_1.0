# 📎 Sistema Allegati Blob - Esempi Pratici

## 🔗 Schema Campi URL Blob

### Products - Esempio Record
```json
{
  "Nome_Prodotto": "Materasso Memory Foam Premium",
  "Codice_Prodotto": "MAT001",
  "URL_Immagine_Principale": "https://blob.vercel-storage.com/materasso-premium-main.jpg",
  "URL_Immagini_Galleria": "[\"https://blob.vercel-storage.com/materasso-premium-1.jpg\",\"https://blob.vercel-storage.com/materasso-premium-2.jpg\",\"https://blob.vercel-storage.com/materasso-premium-3.jpg\"]",
  "URL_Scheda_Tecnica": "https://blob.vercel-storage.com/scheda-tecnica-mat001.pdf",
  "URL_Certificazioni": "[\"https://blob.vercel-storage.com/cert-iso9001.pdf\",\"https://blob.vercel-storage.com/cert-oeko-tex.pdf\"]",
  "URL_Video_Prodotto": "https://blob.vercel-storage.com/video-materasso-premium.mp4"
}
```

### Orders - Esempio Record
```json
{
  "Numero_Ordine": "ORD-2024-001",
  "URL_Contratto": "https://blob.vercel-storage.com/contratto-ord-2024-001.pdf",
  "URL_Documenti_Cliente": "[\"https://blob.vercel-storage.com/documento-identita.pdf\",\"https://blob.vercel-storage.com/codice-fiscale.pdf\"]",
  "URL_Preventivo": "https://blob.vercel-storage.com/preventivo-ord-2024-001.pdf",
  "URL_Documenti_Spedizione": "[\"https://blob.vercel-storage.com/bolla-spedizione.pdf\",\"https://blob.vercel-storage.com/tracking-info.pdf\"]",
  "URL_Foto_Consegna": "[\"https://blob.vercel-storage.com/consegna-foto1.jpg\",\"https://blob.vercel-storage.com/consegna-foto2.jpg\"]"
}
```

### Order_Items - Esempio Record
```json
{
  "Riga_ID": "ITEM-001",
  "URL_Rendering_3D": "https://blob.vercel-storage.com/rendering-3d-configurazione.png",
  "URL_Configurazione_Visual": "https://blob.vercel-storage.com/configurazione-visual.jpg",
  "URL_Schemi_Misure": "[\"https://blob.vercel-storage.com/schema-misure-1.pdf\",\"https://blob.vercel-storage.com/schema-misure-2.pdf\"]",
  "URL_Anteprima_Prodotto": "https://blob.vercel-storage.com/anteprima-prodotto-configurato.jpg"
}
```

## 🛠️ Implementazione Frontend

### Hook Upload Blob
```typescript
// hooks/useBlobUpload.ts
import { upload } from '@vercel/blob/client';

export const useBlobUpload = () => {
  const uploadFile = async (file: File, pathname: string) => {
    const blob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/blob/upload',
    });
    return blob.url;
  };

  const uploadMultipleFiles = async (files: File[], basePath: string) => {
    const urls = await Promise.all(
      files.map((file, index) => 
        uploadFile(file, `${basePath}/${Date.now()}-${index}-${file.name}`)
      )
    );
    return JSON.stringify(urls);
  };

  return { uploadFile, uploadMultipleFiles };
};
```

### Componente Gallery Prodotto
```typescript
// components/ProductGallery.tsx
interface ProductGalleryProps {
  mainImage?: string;
  galleryImages?: string;
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  mainImage,
  galleryImages,
  productName
}) => {
  const images = galleryImages ? JSON.parse(galleryImages) : [];
  
  return (
    <div className="product-gallery">
      {mainImage && (
        <img 
          src={mainImage} 
          alt={`${productName} - Immagine principale`}
          className="main-image"
        />
      )}
      
      <div className="gallery-thumbnails">
        {images.map((url: string, index: number) => (
          <img 
            key={index}
            src={url} 
            alt={`${productName} - Immagine ${index + 1}`}
            className="thumbnail"
          />
        ))}
      </div>
    </div>
  );
};
```

### Componente Upload Documenti Ordine
```typescript
// components/OrderDocumentUpload.tsx
interface OrderDocumentUploadProps {
  orderId: string;
  onDocumentUploaded: (urls: string[]) => void;
}

export const OrderDocumentUpload: React.FC<OrderDocumentUploadProps> = ({
  orderId,
  onDocumentUploaded
}) => {
  const { uploadMultipleFiles } = useBlobUpload();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const urlsJson = await uploadMultipleFiles(
        files, 
        `orders/${orderId}/documents`
      );
      const urls = JSON.parse(urlsJson);
      onDocumentUploaded(urls);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="document-upload">
      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.png,.doc,.docx"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(Array.from(e.target.files));
          }
        }}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
    </div>
  );
};
```

## 📊 Pattern di Utilizzo

### 1. **URL Singoli** 
Per documenti/immagini principali:
```typescript
// Salvare direttamente l'URL
record.URL_Immagine_Principale = "https://blob.vercel-storage.com/image.jpg";
record.URL_Contratto = "https://blob.vercel-storage.com/contract.pdf";
```

### 2. **Array JSON per Multiple**
Per collezioni di file:
```typescript
// Salvare come JSON string
const urls = ["url1.jpg", "url2.jpg", "url3.jpg"];
record.URL_Immagini_Galleria = JSON.stringify(urls);

// Leggere come array
const galleryUrls = JSON.parse(record.URL_Immagini_Galleria || "[]");
```

### 3. **Nomi File Strutturati**
```typescript
// Pattern consigliato per organizzazione
const patterns = {
  products: `products/${productId}/${type}/${timestamp}-${filename}`,
  orders: `orders/${orderId}/${type}/${timestamp}-${filename}`,
  orderItems: `order-items/${itemId}/${type}/${timestamp}-${filename}`,
  transactions: `transactions/${transactionId}/${timestamp}-${filename}`
};
```

## 🔄 Migrazione Dati Esistenti

Se hai già allegati in altri sistemi, puoi migrare:

```typescript
// script di migrazione esempio
const migrateAttachmentsToBlob = async (records: any[]) => {
  for (const record of records) {
    // Download esistente
    const oldUrl = record.old_attachment_url;
    const response = await fetch(oldUrl);
    const blob = await response.blob();
    
    // Upload su Vercel Blob
    const file = new File([blob], 'migrated-file');
    const newUrl = await uploadFile(file, `migrated/${record.id}/file`);
    
    // Update record
    await updateRecord(record.id, {
      URL_Documento: newUrl
    });
  }
};
```

## ⚠️ Considerazioni

### Sicurezza
- I file sono pubblici su Vercel Blob
- Per documenti sensibili considera access token
- Valida sempre tipo/dimensione file lato client e server

### Performance  
- Ottimizza immagini prima dell'upload
- Usa lazy loading per gallery
- Implementa cache per URL frequenti

### Costi
- Vercel Blob ha limiti sui piani gratuiti
- Monitora usage nel dashboard Vercel
- Considera cleanup automatico file vecchi

## 🎯 Vantaggi Sistema

✅ **Compatibile** con avatar esistente  
✅ **Scalabile** con Vercel Blob  
✅ **Flessibile** URL singoli + JSON array  
✅ **Performante** CDN integrato  
✅ **Manutenibile** pattern consistente