const fs = require('fs');

// Analizzo prima i collegamenti alle attività dai leads esistenti
async function analyzeActivityConnections() {
  try {
    console.log('🔍 Analyzing Activity connections from existing leads...\n');

    // Fetch some leads to see activity connections
    const response = await fetch('http://localhost:3000/api/leads?maxRecords=50');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const leadsWithActivities = data.records.filter(lead => lead.Attività && lead.Attività.length > 0);

    console.log(`📊 Found ${data.records.length} total leads`);
    console.log(`🎯 Found ${leadsWithActivities.length} leads with activities\n`);

    if (leadsWithActivities.length > 0) {
      console.log('📋 Leads with Activity connections:');
      leadsWithActivities.forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.Nome} (${lead.id})`);
        console.log(`     Activities: ${lead.Attività.join(', ')}`);
      });

      // Collect all unique activity IDs
      const allActivityIds = new Set();
      leadsWithActivities.forEach(lead => {
        lead.Attività.forEach(activityId => allActivityIds.add(activityId));
      });

      console.log(`\n🆔 Found ${allActivityIds.size} unique Activity IDs:`);
      Array.from(allActivityIds).forEach((id, index) => {
        console.log(`  ${index + 1}. ${id}`);
      });

      // Create analysis report
      const analysis = {
        timestamp: new Date().toISOString(),
        summary: {
          totalLeads: data.records.length,
          leadsWithActivities: leadsWithActivities.length,
          uniqueActivityIds: allActivityIds.size,
          activityIds: Array.from(allActivityIds)
        },
        leadsWithActivities: leadsWithActivities.map(lead => ({
          leadId: lead.id,
          leadName: lead.Nome,
          activityIds: lead.Attività
        }))
      };

      // Save analysis
      const outputFile = 'activity-connections-analysis.json';
      fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
      console.log(`\n💾 Analysis saved to: ${outputFile}`);

      return analysis;
    } else {
      console.log('❌ No leads with activities found');
      return null;
    }
  } catch (error) {
    console.error('Error analyzing activity connections:', error.message);
    return null;
  }
}

// Provo a recuperare informazioni su una specifica attività
async function tryDirectActivityAccess(activityId) {
  try {
    console.log(`\n🔍 Trying to access activity directly: ${activityId}`);
    
    // Provo diverse possibili configurazioni di URL per le attività
    const possibleUrls = [
      `http://localhost:3000/api/activities/${activityId}`,
      `http://localhost:3000/api/activity/${activityId}`,
      `http://localhost:3000/api/tasks/${activityId}`,
      `http://localhost:3000/api/task/${activityId}`
    ];

    for (const url of possibleUrls) {
      try {
        console.log(`  Trying: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`  ✅ SUCCESS! Found activity data:`, data);
          return data;
        } else {
          console.log(`  ❌ Failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('  💡 No direct API endpoints found for activities');
    return null;
  } catch (error) {
    console.error('Error in direct activity access:', error.message);
    return null;
  }
}

// Suggerisci la struttura dei tipi basata sui pattern dei leads
function generateActivityTypeSuggestion() {
  console.log('\n🎯 SUGGESTED ACTIVITY DATA STRUCTURE BASED ON LEADS PATTERN:\n');
  
  const suggestion = `
// Based on leads structure, ActivityData should have:
export interface ActivityData {
  // === IDENTIFICATIVI === (same as leads)
  id: string;                          // Airtable record ID
  ID: string;                          // Campo formula da Airtable
  
  // === INFORMAZIONI BASE ===
  Titolo: string;                      // Activity title/name
  Tipo: ActivityType;                  // Call, Email, Meeting, etc.
  Descrizione?: string;                // Description
  
  // === CATEGORIZZAZIONE ===  
  Stato: ActivityStatus;               // Scheduled, Completed, etc.
  Priorità: ActivityPriority;          // High, Medium, Low
  
  // === TIMING ===
  'Data creazione': string;            // Creation date 
  'Data programmata': string;          // Scheduled date
  'Data completamento'?: string;       // Completion date
  Durata?: number;                     // Duration in minutes
  
  // === COLLEGAMENTI === (follows leads pattern)
  Lead?: string[];                     // Link to Leads table (like leads.Attività)
  'Nome Lead'?: string[];              // Lookup field
  Assegnatario?: string[];             // Link to Users table
  'Nome Assegnatario'?: string[];      // Lookup field
  
  // === RISULTATI ===
  Esito?: ActivityOutcome;             // Positive, Negative, etc.
  Note?: string;                       // Free notes
  'Prossimi step'?: string;            // Next actions
  
  // === METADATI ===
  createdTime: string;                 // Airtable timestamp
}`;

  console.log(suggestion);
  
  return suggestion;
}

async function main() {
  console.log('🚀 Starting Activity Metadata Analysis...\n');

  // Step 1: Analyze connections from leads
  const connectionAnalysis = await analyzeActivityConnections();

  // Step 2: Try direct access if we found activity IDs
  if (connectionAnalysis && connectionAnalysis.summary.activityIds.length > 0) {
    const firstActivityId = connectionAnalysis.summary.activityIds[0];
    await tryDirectActivityAccess(firstActivityId);
  }

  // Step 3: Generate type suggestions
  generateActivityTypeSuggestion();

  console.log('\n✅ Analysis complete!');
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Check if activity-connections-analysis.json was created');
  console.log('2. Use the suggested ActivityData structure for implementation');
  console.log('3. Create API endpoint /api/activities based on leads pattern');
  console.log('4. Implement components following leads structure\n');
}

main().catch(console.error);
