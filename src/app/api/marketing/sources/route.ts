import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
} from '@/lib/api-keys-service';

export async function GET(request: NextRequest) {
  try {
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Sources?sort%5B0%5D%5Bfield%5D=Name&sort%5B0%5D%5Bdirection%5D=asc`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    const sources = data.records.map((record: any) => ({
      id: record.id,
      name: record.fields.Name,
      description: record.fields.Description,
      active: record.fields.Active || false,
      color: record.fields.Color,
      createdTime: record.createdTime,
    }));

    return NextResponse.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    console.error('❌ [Marketing Sources API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, active = true, color } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    // Check if source with same name already exists
    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Sources?filterByFormula=Name%3D%22${encodeURIComponent(name)}%22`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.records.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Una fonte con questo nome esiste già' },
          { status: 400 }
        );
      }
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Sources`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            Description: description,
            Active: active,
            Color: color,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Airtable API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        name: data.fields.Name,
        description: data.fields.Description,
        active: data.fields.Active || false,
        color: data.fields.Color,
      },
    });
  } catch (error) {
    console.error('❌ [Marketing Sources API] Create Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
