/**
 * Utility per la gestione degli avatar basati sul genere del nome
 * 
 * Sistema intelligente:
 * - AI detection con OpenRouter (primary)
 * - Fallback basic solo se AI non disponibile
 */

export type Gender = 'male' | 'female' | 'unknown';

/**
 * Fallback basic per determinare genere (solo euristica suffissi)
 * Usato SOLO se AI non disponibile
 * @param nome Nome completo della persona
 * @returns 'male' | 'female' | 'unknown'
 */
function inferGenderBasic(nome: string): Gender {
  if (!nome || typeof nome !== 'string') {
    return 'unknown';
  }

  // Estrai il primo nome e normalizzalo
  const primoNome = nome.trim().split(' ')[0].toLowerCase();

  if (!primoNome) {
    return 'unknown';
  }

  // Euristica basata sui suffissi italiani comuni
  // Nomi che finiscono in 'a' (esclusi quelli in 'ia') → femminile
  if (primoNome.endsWith('a') && !primoNome.endsWith('ia')) {
    return 'female';
  }

  // Nomi che finiscono in 'o' o 'e' → maschile
  if (primoNome.endsWith('o') || primoNome.endsWith('e')) {
    return 'male';
  }

  // Se non riusciamo a determinare
  return 'unknown';
}

/**
 * Rileva il genere usando AI (OpenRouter)
 * Primary method per gender detection
 * @param nome Nome completo della persona
 * @returns Promise<Gender>
 */
export async function detectGenderWithAI(nome: string): Promise<Gender> {
  try {
    const response = await fetch('/api/ai/detect-gender', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: nome }), // API expects 'name' not 'nome'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.gender as Gender;
  } catch (error) {
    console.error('[avatar-utils] AI gender detection fallito:', error);
    // Fallback all'euristica basic
    return inferGenderBasic(nome);
  }
}

/**
 * Ottiene il percorso dell'avatar basato sul genere
 * @param nome Nome della persona
 * @param customGender Genere custom se già noto (da AI detection)
 * @returns Percorso relativo dell'avatar
 */
export function getAvatarPath(
  nome: string,
  customGender?: Gender
): string {
  const gender = customGender || inferGenderBasic(nome);

  switch (gender) {
    case 'male':
      return '/avatars/male.svg';
    case 'female':
      return '/avatars/female.svg';
    default:
      return '/avatars/neutral.svg';
  }
}

/**
 * Ottiene le iniziali da un nome per il fallback dell'avatar
 * @param nome Nome completo
 * @returns Iniziali (massimo 2 caratteri)
 */
export function getInitials(nome: string): string {
  if (!nome || typeof nome !== 'string') {
    return '?';
  }

  return nome
    .trim()
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Determina il colore di sfondo per l'avatar fallback basato sul genere
 * @param nome Nome della persona
 * @param customGender Genere custom se già noto (da AI detection)
 * @returns Classe CSS Tailwind per il colore di sfondo
 */
export function getAvatarFallbackColor(
  nome: string,
  customGender?: Gender
): string {
  // Se non abbiamo gender custom, usa fallback basic
  const gender = customGender || inferGenderBasic(nome);

  switch (gender) {
    case 'male':
      return 'bg-blue-500';
    case 'female':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Ottiene il colore deterministico basato sul nome (per avatar iniziali)
 * Usato quando non serve distinzione di genere
 * @param nome Nome completo
 * @returns Classe CSS Tailwind per il colore
 */
export function getDeterministicColor(nome: string): string {
  if (!nome) return 'bg-gray-500';

  // Hash il nome per ottenere un indice
  const hash = nome.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
