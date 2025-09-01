/**
 * Utility per la gestione degli avatar basati sul genere del nome
 */

// Lista di nomi tipicamente maschili in italiano
const NOMI_MASCHILI = [
  'alessandro', 'andrea', 'antonio', 'carlo', 'claudio', 'davide', 'domenico', 'emanuele',
  'enrico', 'fabio', 'federico', 'francesco', 'gabriele', 'giacomo', 'giovanni', 'giuseppe',
  'luca', 'luigi', 'marco', 'mario', 'massimo', 'matteo', 'michele', 'nicola', 'paolo',
  'pietro', 'roberto', 'salvatore', 'sergio', 'stefano', 'vincenzo', 'alberto', 'alfredo',
  'aldo', 'bruno', 'cesare', 'daniele', 'dario', 'diego', 'enzo', 'filippo', 'franco',
  'gian', 'gianluca', 'giorgio', 'giulio', 'guido', 'leonardo', 'lorenzo', 'maurizio',
  'mauro', 'mirko', 'pasquale', 'riccardo', 'simone', 'tommaso', 'umberto', 'valentino',
  'valerio', 'walter', 'alessandro', 'armando', 'arturo', 'attilio', 'augusto', 'benito',
  'biagio', 'calogero', 'carmelo', 'christian', 'cristian', 'damiano', 'dino', 'edoardo',
  'egidio', 'emilio', 'ermanno', 'ernesto', 'ettore', 'eugenio', 'ezio', 'fabrizio',
  'fausto', 'ferdinando', 'flavio', 'fulvio', 'gaetano', 'gennaro', 'gerardo', 'gianfranco',
  'giancarlo', 'gianni', 'gino', 'ivano', 'lamberto', 'leandro', 'livio', 'luciano',
  'marcello', 'michele', 'nino', 'orazio', 'osvaldo', 'otello', 'patrizio', 'pier',
  'pierluigi', 'raffaele', 'remo', 'renato', 'renzo', 'rocco', 'rodolfo', 'romano',
  'rosario', 'ruggero', 'saverio', 'silvano', 'tiziano', 'ugo', 'vito'
];

// Lista di nomi tipicamente femminili in italiano
const NOMI_FEMMINILI = [
  'alessandra', 'angela', 'anna', 'antonella', 'barbara', 'carla', 'claudia', 'cristina',
  'daniela', 'elena', 'elisabetta', 'emanuela', 'federica', 'francesca', 'giada', 'giovanna',
  'giulia', 'giuseppina', 'laura', 'lucia', 'luisa', 'manuela', 'maria', 'marina',
  'marta', 'michela', 'monica', 'paola', 'patrizia', 'raffaella', 'rita', 'roberta',
  'rosa', 'rosanna', 'sandra', 'sara', 'serena', 'silvia', 'simona', 'stefania',
  'teresa', 'valentina', 'valeria', 'vera', 'alessia', 'alice', 'amanda', 'ambra',
  'annamaria', 'antonia', 'arianna', 'beatrice', 'bianca', 'bruna', 'camilla', 'caterina',
  'catia', 'cecilia', 'chiara', 'cinzia', 'clara', 'concetta', 'debora', 'diana',
  'donatella', 'eleonora', 'elisa', 'elsa', 'emma', 'enrica', 'erica', 'ester',
  'eva', 'fabiana', 'fabiola', 'flavia', 'flora', 'franca', 'gabriella', 'gemma',
  'gilda', 'gina', 'gloria', 'grazia', 'ida', 'ilaria', 'irene', 'isabella',
  'katia', 'lara', 'letizia', 'licia', 'liliana', 'lisa', 'lorena', 'lorenza',
  'loredana', 'luciana', 'maddalena', 'marcella', 'margherita', 'marisa', 'maura',
  'milena', 'miriam', 'nadia', 'natalia', 'nicole', 'norma', 'olga', 'ombretta',
  'ornella', 'pamela', 'pia', 'priscilla', 'renata', 'rossana', 'sabrina', 'samanta',
  'sonia', 'susanna', 'tania', 'tiziana', 'tosca', 'ursula', 'viviana', 'zara'
];

/**
 * Determina il genere di una persona dal suo nome
 * @param nome Nome completo della persona
 * @returns 'male' | 'female' | 'unknown'
 */
export function inferGenderFromName(nome: string): 'male' | 'female' | 'unknown' {
  if (!nome || typeof nome !== 'string') {
    return 'unknown';
  }

  // Estrai il primo nome e normalizzalo
  const primoNome = nome.trim().split(' ')[0].toLowerCase();
  
  if (!primoNome) {
    return 'unknown';
  }

  // Controlla se è un nome maschile
  if (NOMI_MASCHILI.includes(primoNome)) {
    return 'male';
  }

  // Controlla se è un nome femminile
  if (NOMI_FEMMINILI.includes(primoNome)) {
    return 'female';
  }

  // Euristica basata sui suffissi comuni italiani
  if (primoNome.endsWith('a') && !primoNome.endsWith('ia')) {
    // La maggior parte dei nomi che finiscono in 'a' sono femminili
    // Ma escludiamo quelli che finiscono in 'ia' che spesso sono maschili (es. Mattia, Nicchia)
    return 'female';
  }
  
  if (primoNome.endsWith('o') || primoNome.endsWith('e')) {
    // I nomi che finiscono in 'o' sono generalmente maschili
    // I nomi che finiscono in 'e' sono spesso maschili (Michele, Emanuele)
    return 'male';
  }

  // Se non riusciamo a determinare il genere
  return 'unknown';
}

/**
 * Ottiene il percorso dell'avatar basato sul genere inferito dal nome
 * @param nome Nome della persona
 * @param isAdmin Se true, restituisce sempre l'avatar admin
 * @returns Percorso relativo dell'avatar
 */
export function getAvatarPath(nome: string, isAdmin: boolean = false): string {
  if (isAdmin) {
    return '/avatars/admin.png';
  }

  const gender = inferGenderFromName(nome);
  
  switch (gender) {
    case 'male':
      return '/avatars/male.png';
    case 'female':
      return '/avatars/female.png';
    default:
      return '/avatars/avatar.png';
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
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Determina il colore di sfondo per l'avatar fallback basato sul genere
 * @param nome Nome della persona
 * @returns Classe CSS per il colore di sfondo
 */
export function getAvatarFallbackColor(nome: string): string {
  const gender = inferGenderFromName(nome);
  
  switch (gender) {
    case 'male':
      return 'bg-blue-500';
    case 'female':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
}
