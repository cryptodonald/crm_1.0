'use server';

import { revalidatePath } from 'next/cache';

/**
 * Invalida il cache per l'ordine e la lista ordini
 * Usato dopo un salvataggio per forzare il refresh dei dati
 */
export async function invalidateOrderCache(orderId: string) {
  try {
    // Invalida la pagina specifica dell'ordine
    revalidatePath(`/orders/${orderId}`, 'page');
    
    // Invalida la pagina di edit
    revalidatePath(`/orders/edit/${orderId}`, 'page');
    
    // Invalida la lista ordini
    revalidatePath('/orders', 'page');
    
    console.log(`✅ Cache invalidated for order: ${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error invalidating cache:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
