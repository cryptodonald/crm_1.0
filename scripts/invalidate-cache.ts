/**
 * Script: Invalida cache dopo modifiche al database
 */

import { memoryCache } from '../src/lib/memory-cache';

console.log('🔄 Invalidando cache...\n');

const statsBefore = memoryCache.getStats();
console.log(`Cache prima: ${statsBefore.size} chiavi`);

memoryCache.invalidate('leads:page:*');

const statsAfter = memoryCache.getStats();
console.log(`Cache dopo: ${statsAfter.size} chiavi\n`);

console.log('✅ Cache invalidata!');
console.log('💡 Ricarica la pagina /leads nel browser per vedere i dati aggiornati');
