import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';

// Using existing Product_Variants table with new structure fields
const STRUCTURE_VARIANTS_TABLE_ID = 'tblGnZgea6HlO2pJ4'; // Product_Variants table ID

interface StructureVariant {
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

/**
 * POST /api/structure-variants
 * Salva in batch le varianti strutturate da CSV
 */
export async function POST(request: NextRequest) {
  console.log('🚀 [API] Structure Variants - Starting batch import');
  
  try {
    const body = await request.json();
    const variants: StructureVariant[] = body.variants;

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { error: 'No variants provided or invalid format' },
        { status: 400 }
      );
    }

    console.log(`🔧 [API] Processing ${variants.length} structure variants`);

    // Get API credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId()
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 500 }
      );
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${STRUCTURE_VARIANTS_TABLE_ID}`;

    // Get structure IDs to link variants to multiple structures
    let structureRecordIds: string[] = [];
    if (variants.length > 0 && variants[0].structure_name && variants[0].structure_name !== 'Generic') {
      // Parse structure names (could be comma-separated for multi-structure variants)
      const structureNames = variants[0].structure_name.split(',').map(name => name.trim());
      
      console.log(`🔍 [API] Looking for structures:`, structureNames);
      
      // Find all structure records by names
      for (const structureName of structureNames) {
        const structureSearchUrl = `https://api.airtable.com/v0/${baseId}/tbl58tZxGfEnLpUZA`;
        const structureSearchParams = new URLSearchParams({
          filterByFormula: `{Nome} = "${structureName}"`,
          maxRecords: '1'
        });
        
        try {
          const structureResponse = await fetch(`${structureSearchUrl}?${structureSearchParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (structureResponse.ok) {
            const structureData = await structureResponse.json();
            if (structureData.records && structureData.records.length > 0) {
              const recordId = structureData.records[0].id;
              structureRecordIds.push(recordId);
              console.log(`🔗 [API] Found structure record: ${recordId} for "${structureName}"`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ [API] Could not find structure record for "${structureName}":`, error);
        }
      }
    }

    // Convert structure variants to existing Product_Variants table format
    // Store structure info in the available fields
    const airtableRecords = variants.map((variant, index) => ({
      fields: {
        // Use existing fields in simple way
        Tipo_Variante: variant.field_name, // Just the field name (e.g. "Modello", "Taglia", etc.)
        Codice_Variante: variant.code,
        Nome_Variante: variant.name, // Clean name without prefixes
        Descrizione_Variante: variant.description || '', // Clean user description
        Prezzo_Aggiuntivo_Attuale: variant.price_modifier,
        Costo_Aggiuntivo_Attuale: variant.cost_modifier,
        Attivo: variant.active,
        Posizione: variant.posizione ?? (index + 1), // Use provided position or fallback to index + 1
        ID_Prodotto: [], // Empty array - structure variants not tied to specific products
        // 🔗 CRITICAL FIX: Link to multiple structures!
        ...(structureRecordIds.length > 0 && { Product_Structures: structureRecordIds })
      }
    }));

    // Airtable batch create supports max 10 records per request
    const BATCH_SIZE = 10;
    const batches: any[][] = [];
    
    for (let i = 0; i < airtableRecords.length; i += BATCH_SIZE) {
      batches.push(airtableRecords.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 [API] Splitting into ${batches.length} batches of max ${BATCH_SIZE} records each`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📡 [API] Processing batch ${i + 1}/${batches.length} (${batch.length} records)`);
      
      try {
        const response = await fetch(airtableUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ records: batch }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [API] Batch ${i + 1} failed: ${response.status} - ${errorText}`);
          errorCount += batch.length;
          continue;
        }

        const result = await response.json();
        results.push(...result.records);
        successCount += batch.length;
        console.log(`✅ [API] Batch ${i + 1} completed successfully (${batch.length} records)`);

        // Add small delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (batchError: any) {
        console.error(`❌ [API] Batch ${i + 1} error:`, batchError.message);
        errorCount += batch.length;
      }
    }

    const summary = {
      total_requested: variants.length,
      total_created: successCount,
      total_errors: errorCount,
      batches_processed: batches.length,
      success_rate: ((successCount / variants.length) * 100).toFixed(1) + '%'
    };

    console.log('📊 [API] Import Summary:', summary);

    if (errorCount === 0) {
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${successCount} structure variants`,
        summary,
        records: results
      });
    } else if (successCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Partially imported ${successCount}/${variants.length} structure variants`,
        summary,
        records: results,
        warnings: [`${errorCount} variants failed to import`]
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to import any variants', 
          summary 
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ [API] Structure Variants import error:', error.message);
    return NextResponse.json(
      { error: 'Failed to import structure variants: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/structure-variants
 * Recupera le varianti strutturate dalla tabella Product_Variants
 */
export async function GET(request: NextRequest) {
  console.log('🔧 [API] Structure Variants - Loading from Product_Variants table');
  
  try {
    const { searchParams } = new URL(request.url);
    const structureName = searchParams.get('structure');

    // Get API credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId()
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 500 }
      );
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${STRUCTURE_VARIANTS_TABLE_ID}`;
    
    // Build filter for structure variants:
    // TEMPORARILY: Remove filter to see what's in the table
    // const filterFormula = 'AND(OR({ID_Prodotto} = "", {ID_Prodotto} = BLANK()), {Attivo} = 1)';
    
    const queryParams = new URLSearchParams({
      // filterByFormula: filterFormula, // DISABLED FOR DEBUG
      'sort[0][field]': 'Tipo_Variante',
      'sort[0][direction]': 'asc',
      'sort[1][field]': 'Posizione',
      'sort[1][direction]': 'asc',
      maxRecords: '100' // Reduced for debug
    });

    const response = await fetch(`${airtableUrl}?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const records = data.records || [];
    
    console.log(`🔍 [DEBUG] Raw records from Airtable:`, records.length);
    if (records.length > 0) {
      console.log(`🔍 [DEBUG] First record fields:`, records[0].fields);
      console.log(`🔍 [DEBUG] All Tipo_Variante values:`, records.map((r: any) => r.fields.Tipo_Variante));
      console.log(`🔍 [DEBUG] All Attivo values:`, records.map((r: any) => r.fields.Attivo));
      console.log(`🔍 [DEBUG] All ID_Prodotto values:`, records.map((r: any) => r.fields.ID_Prodotto));
    }

    // Convert to structure variant format using real Airtable fields
    const structureVariants = records.map((record: any) => {
      const fields = record.fields;
      
      // Use Tipo_Variante as both field_id and field_name
      const tipoVariante = fields.Tipo_Variante || 'unknown';
      
      return {
        id: record.id,
        structure_name: 'Generic', // Per ora generico, in futuro collegato alle strutture
        field_id: tipoVariante.toLowerCase().replace(/\s+/g, '_'), // ID normalizzato
        field_name: tipoVariante, // Nome leggibile
        code: fields.Codice_Variante || '',
        name: fields.Nome_Variante || '',
        description: fields.Descrizione_Variante || '',
        price_modifier: fields.Prezzo_Aggiuntivo_Attuale || 0,
        cost_modifier: fields.Costo_Aggiuntivo_Attuale || 0,
        active: fields.Attivo !== false,
        position: fields.Posizione || 0,
        created_time: record.createdTime
      };
    });

    // Filter by structure name if requested using the actual Product_Structures link
    let filteredVariants = structureVariants;
    if (structureName && structureName !== 'Generic') {
      // Find structure record by name to get its ID
      const structureSearchUrl = `https://api.airtable.com/v0/${baseId}/tbl58tZxGfEnLpUZA`;
      const structureSearchParams = new URLSearchParams({
        filterByFormula: `{Nome} = "${structureName}"`,
        maxRecords: '1'
      });
      
      try {
        const structureResponse = await fetch(`${structureSearchUrl}?${structureSearchParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (structureResponse.ok) {
          const structureData = await structureResponse.json();
          if (structureData.records && structureData.records.length > 0) {
            const structureId = structureData.records[0].id;
            console.log(`🔍 [API] Filtering variants for structure: ${structureName} (${structureId})`);
            
            // Filter variants that are linked to this structure
            filteredVariants = records
              .filter((record: any) => {
                const linkedStructures = record.fields.Product_Structures || [];
                return linkedStructures.includes(structureId);
              })
              .map((record: any) => {
                const fields = record.fields;
                const tipoVariante = fields.Tipo_Variante || 'unknown';
                
                return {
                  id: record.id,
                  structure_name: structureName, // Use the requested structure name
                  field_id: tipoVariante.toLowerCase().replace(/\s+/g, '_'),
                  field_name: tipoVariante,
                  code: fields.Codice_Variante || '',
                  name: fields.Nome_Variante || '',
                  description: fields.Descrizione_Variante || '',
                  price_modifier: fields.Prezzo_Aggiuntivo_Attuale || 0,
                  cost_modifier: fields.Costo_Aggiuntivo_Attuale || 0,
                  active: fields.Attivo !== false,
                  position: fields.Posizione || 0,
                  created_time: record.createdTime
                };
              });
          }
        }
      } catch (error) {
        console.warn('⚠️ [API] Could not filter by structure:', error);
        // Fallback to showing all variants
        filteredVariants = structureVariants;
      }
    } else {
      // If no specific structure requested, show variants without structure links (legacy behavior)
      filteredVariants = structureVariants.filter(variant => !variant.Product_Structures || variant.Product_Structures.length === 0);
    }

    console.log(`✅ [API] Loaded ${filteredVariants.length} structure variants from Product_Variants`);

    return NextResponse.json({
      variants: filteredVariants,
      total: filteredVariants.length
    });

  } catch (error: any) {
    console.error('❌ [API] Error loading structure variants:', error.message);
    return NextResponse.json(
      { error: 'Failed to load structure variants: ' + error.message },
      { status: 500 }
    );
  }
}

