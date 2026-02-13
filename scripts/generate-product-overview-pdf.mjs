/**
 * Script per generare il PDF "Panoramica Prodotti & Algoritmo" su disco.
 * 
 * Usage: node scripts/generate-product-overview-pdf.mjs
 * Output: docs/Doctorbed_Panoramica_Prodotti.pdf
 */

import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ============================================================================
// Styles
// ============================================================================

const colors = {
  primary: '#1e3a5f',
  primaryLight: '#3b6fa0',
  accent: '#4a90d9',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray600: '#525252',
  gray800: '#262626',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: colors.gray800 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: colors.primary },
  brandName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: colors.primary, letterSpacing: 1 },
  brandTagline: { fontSize: 8, color: colors.gray600, marginTop: 2 },
  docDate: { fontSize: 8, color: colors.gray400 },
  pageTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 6, marginTop: 14 },
  subTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 4, marginTop: 8 },
  text: { fontSize: 9, lineHeight: 1.5, color: colors.gray800 },
  textSmall: { fontSize: 8, lineHeight: 1.4, color: colors.gray600 },
  bold: { fontFamily: 'Helvetica-Bold' },
  card: { backgroundColor: colors.gray100, borderRadius: 4, padding: 10, marginBottom: 8 },
  cardHighlight: { backgroundColor: '#eef4fb', borderRadius: 4, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: colors.accent },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.gray200, paddingVertical: 4 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 5, backgroundColor: colors.gray100 },
  tableCell: { flex: 1, fontSize: 8, paddingHorizontal: 4 },
  tableCellHeader: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', paddingHorizontal: 4, color: colors.primary },
  modelCard: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 4, padding: 10, marginBottom: 8, width: '100%' },
  modelName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 4 },
  badge: { backgroundColor: colors.primary, color: colors.white, fontSize: 7, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  layerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  layerColor: { width: 16, height: 10, borderRadius: 2, marginRight: 6 },
  row: { flexDirection: 'row', gap: 10 },
  col2: { flex: 1 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: colors.gray300, paddingTop: 6 },
  footerText: { fontSize: 7, color: colors.gray400 },
  bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 8 },
  bullet: { width: 10, fontSize: 9, color: colors.gray600 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.4 },
});

// ============================================================================
// Helpers
// ============================================================================

const e = React.createElement;

function Header() {
  return e(View, { style: styles.header },
    e(View, null,
      e(Text, { style: styles.brandName }, 'doctorbed'),
      e(Text, { style: styles.brandTagline }, 'Il materasso che si adatta a te. Non il contrario.')
    ),
    e(View, null,
      e(Text, { style: styles.docDate }, 'Documento Riservato'),
      e(Text, { style: styles.docDate }, new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }))
    )
  );
}

function Footer({ pageNum }) {
  return e(View, { style: styles.footer },
    e(Text, { style: styles.footerText }, 'Doctorbed — Dispositivo Medico Classe I'),
    e(Text, { style: styles.footerText }, `Panoramica Prodotti & Algoritmo — Pag. ${pageNum}`)
  );
}

function Bullet({ children }) {
  return e(View, { style: styles.bulletRow },
    e(Text, { style: styles.bullet }, '•'),
    e(Text, { style: styles.bulletText }, children)
  );
}

function TableRow({ cells, isHeader = false }) {
  const rowStyle = isHeader ? styles.tableHeader : styles.tableRow;
  const cellStyle = isHeader ? styles.tableCellHeader : styles.tableCell;
  return e(View, { style: rowStyle },
    ...cells.map((cell, i) => e(Text, { key: i, style: cellStyle }, cell))
  );
}

// ============================================================================
// PAGE 1 — Cover + Overview Modelli
// ============================================================================

function Page1() {
  return e(Page, { size: 'A4', style: styles.page },
    e(Header),
    e(Text, { style: styles.pageTitle }, 'Panoramica Prodotti & Tecnologia'),
    e(Text, { style: styles.text }, "Doctorbed è l'unico sistema letto in Europa completamente personalizzabile. Ogni materasso è configurato sulle caratteristiche fisiche del cliente: peso, altezza, forma del corpo, posizione di sonno e preferenze personali. Certificato Dispositivo Medico Classe I."),

    // Struttura Universale
    e(Text, { style: styles.sectionTitle }, 'Struttura Universale — 23cm'),
    e(Text, { style: styles.text }, 'Tutti i modelli condividono la stessa architettura a strati e la stessa cover. Altezza totale: 23cm per ogni modello.'),

    e(View, { style: styles.card },
      e(View, { style: styles.layerRow },
        e(View, { style: [styles.layerColor, { backgroundColor: '#e0e7ef' }] }),
        e(Text, { style: styles.text },
          e(Text, { style: styles.bold }, 'Cover superiore'), ' — Tessuto tecnico fresco, antiallergico, traspirante'
        )
      ),
      e(View, { style: styles.layerRow },
        e(View, { style: [styles.layerColor, { backgroundColor: '#d4c96a' }] }),
        e(Text, { style: styles.text },
          e(Text, { style: styles.bold }, 'Topper (ZeroGravity™)'), ' — Viscoelastico a cella aperta. 5cm (ONE) o 8cm (PLUS/PRO)'
        )
      ),
      e(View, { style: styles.layerRow },
        e(View, { style: [styles.layerColor, { backgroundColor: '#9ca3af' }] }),
        e(Text, { style: styles.text },
          e(Text, { style: styles.bold }, 'Base (SmartBase™)'), ' — Poliuretano HR ad alta resilienza. 17cm (ONE) o 14cm (PLUS/PRO)'
        )
      ),
      e(View, { style: styles.layerRow },
        e(View, { style: [styles.layerColor, { backgroundColor: '#d1d5db' }] }),
        e(Text, { style: styles.text },
          e(Text, { style: styles.bold }, 'Cover inferiore'), ' — Tessuto 3D super traspirante + fascia laterale imbottita con maniglie'
        )
      ),
      e(Text, { style: styles.textSmall }, 'Cerniera tra topper e base per sfoderamento completo.')
    ),

    // 3 Modelli
    e(Text, { style: styles.sectionTitle }, 'Tre Livelli di Personalizzazione'),

    // ONE
    e(View, { style: styles.modelCard },
      e(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 } },
        e(Text, { style: styles.modelName }, 'Modularbed ONE'),
        e(Text, { style: styles.badge }, '3 Regolazioni')
      ),
      e(Text, { style: styles.text }, 'Topper fisso 5cm (2,5cm soft + 2,5cm hard). Base 17cm con scanalature ergonomiche in 3 densità (Soft / Medium / Hard). DualComfort™ per regolazione indipendente per lato.'),
      e(Text, { style: styles.textSmall }, 'Ideale per coppie con esigenze simili che cercano un sostegno equilibrato.')
    ),

    // PLUS
    e(View, { style: styles.modelCard },
      e(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 } },
        e(Text, { style: styles.modelName }, 'Modularbed PLUS'),
        e(Text, { style: styles.badge }, '18 Regolazioni')
      ),
      e(Text, { style: styles.text }, 'Topper 8cm configurabile in 6 rigidità. Base 14cm con scanalature ergonomiche in 3 densità. 6 topper × 3 basi = 18 combinazioni per lato. DualComfort™.'),
      e(Text, { style: styles.textSmall }, 'Pensato per coppie con esigenze diverse che vogliono una regolazione precisa.')
    ),

    // PRO
    e(View, { style: styles.modelCard },
      e(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 } },
        e(Text, { style: styles.modelName }, 'Modularbed PRO'),
        e(Text, { style: styles.badge }, 'Regolazioni illimitate')
      ),
      e(Text, { style: styles.text }, 'Topper 8cm (6 rigidità) + Base 14cm (3 densità) + TubeLayer System™ con 10 cilindri modulari in 3 zone personalizzabili (4 tipi di cilindro). DualComfort™.'),
      e(Text, { style: styles.textSmall }, 'Per chi ha esigenze complesse, dolori specifici o cerca il massimo controllo.')
    ),

    e(Footer, { pageNum: 1 })
  );
}

// ============================================================================
// PAGE 2 — Materiali & Specifiche Tecniche
// ============================================================================

function Page2() {
  return e(Page, { size: 'A4', style: styles.page },
    e(Header),
    e(Text, { style: styles.pageTitle }, 'Materiali & Specifiche Tecniche'),

    e(Text, { style: styles.sectionTitle }, 'Scelta dei Materiali'),
    e(Text, { style: styles.text }, 'Doctorbed utilizza esclusivamente materiali espansi di alta qualità, superiori a molle (micropressioni, usura, rumore, incompatibilità con reti motorizzate) e lattice (pesante, costoso, si sgretola nel tempo).'),

    e(Text, { style: styles.sectionTitle }, 'Materiali Topper (ZeroGravity™)'),
    e(Text, { style: styles.text }, 'Il topper è composto da 2 strati di viscoelastico a cella aperta (10× più traspirante del memory tradizionale) combinati in proporzioni diverse per creare 6 livelli di rigidità.'),

    e(View, { style: styles.card },
      e(TableRow, { cells: ['Materiale', 'Densità', 'kPa', 'Funzione'], isHeader: true }),
      e(TableRow, { cells: ['Visco Soft', '50-60 kg/m³', '2.5-4', 'Comfort, dissipa pressione'] }),
      e(TableRow, { cells: ['Visco Hard', '60-75 kg/m³', '5.5-8', 'Transizione, sostegno'] })
    ),

    e(Text, { style: styles.subTitle }, '6 Livelli di Rigidità Topper (8cm — PLUS & PRO)'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Liv.', 'Composizione', 'Range peso', 'Sensazione'], isHeader: true }),
      e(TableRow, { cells: ['1', '8cm Soft', '40-55 kg', 'Ultra morbido'] }),
      e(TableRow, { cells: ['2', '6cm Soft + 2cm Hard', '50-65 kg', 'Morbido'] }),
      e(TableRow, { cells: ['3', '4cm Soft + 4cm Hard', '60-80 kg', 'Medio'] }),
      e(TableRow, { cells: ['4', '2cm Soft + 6cm Hard', '75-90 kg', 'Sostenuto'] }),
      e(TableRow, { cells: ['5', '8cm Hard', '85-110 kg', 'Rigido'] }),
      e(TableRow, { cells: ['6', '4cm Hard + 4cm HR', '105-140+ kg', 'Ultra rigido'] })
    ),
    e(Text, { style: styles.textSmall }, 'ONE: topper fisso 5cm (2,5cm Soft + 2,5cm Hard). Lo strato Soft è sempre sopra (lato corpo).'),

    e(Text, { style: styles.sectionTitle }, 'Materiali Base (SmartBase™)'),
    e(Text, { style: styles.text }, 'Poliuretano HR (alta resilienza) con scanalature ergonomiche (ONE & PLUS) o cavità per cilindri (PRO). 3 densità selezionabili.'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Densità', 'kg/m³', 'kPa', 'Range peso'], isHeader: true }),
      e(TableRow, { cells: ['Soft', '35-40', '2.5-3.5', '45-70 kg'] }),
      e(TableRow, { cells: ['Medium', '40-50', '4-5.5', '65-95 kg'] }),
      e(TableRow, { cells: ['Hard', '50-60', '6-8', '90-130+ kg'] })
    ),

    e(Text, { style: styles.sectionTitle }, 'Cilindri TubeLayer System™ (solo PRO)'),
    e(Text, { style: styles.text }, '10 cilindri modulari HR distribuiti in 3 zone (3 spalle + 4 lombare + 3 gambe). Incassati nella parte superiore della base (8cm). 4 tipi intercambiabili.'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Tipo', 'Ø cm', 'kg/m³', 'kPa', 'Uso tipico'], isHeader: true }),
      e(TableRow, { cells: ['Super Soft', '6', '25-30', '1.8-2.5', 'Spalle (default)'] }),
      e(TableRow, { cells: ['Soft', '8', '25-30', '1.8-2.5', 'Spalle pesanti'] }),
      e(TableRow, { cells: ['Medium', '8', '40-50', '4-5.5', 'Lombare standard'] }),
      e(TableRow, { cells: ['Firm', '8', '50-60', '6-8', 'Lombare robusti'] })
    ),
    e(Text, { style: styles.textSmall }, 'Zone: Spalle (~55cm, 3 cilindri) — Lombare/Bacino (~70cm, 4 cilindri) — Gambe (~55cm, 3 cilindri). Gambe speculare a spalle.'),

    e(Footer, { pageNum: 2 })
  );
}

// ============================================================================
// PAGE 3 — Algoritmo di Configurazione
// ============================================================================

function Page3() {
  return e(Page, { size: 'A4', style: styles.page },
    e(Header),
    e(Text, { style: styles.pageTitle }, 'Algoritmo di Configurazione'),
    e(Text, { style: styles.text }, "L'algoritmo analizza 7 parametri del cliente per generare automaticamente la configurazione ideale per ciascun modello. Il peso è il parametro primario che limita il range ammesso, gli altri parametri regolano la posizione all'interno di quel range."),

    e(Text, { style: styles.sectionTitle }, "7 Parametri dell'Anamnesi"),
    e(View, { style: styles.row },
      e(View, { style: styles.col2 },
        e(Bullet, null, 'Sesso (M/F)'),
        e(Bullet, null, 'Peso (kg)'),
        e(Bullet, null, 'Altezza (cm)'),
        e(Bullet, null, 'Body shape (silhouette selezionabile)')
      ),
      e(View, { style: styles.col2 },
        e(Bullet, null, 'Posizione di sonno (lato/supino/prono/misto)'),
        e(Bullet, null, 'Preferenza rigidità (accogliente/neutro/sostenuto)'),
        e(Bullet, null, 'Problematiche (multi-selezione)')
      )
    ),

    e(Text, { style: styles.sectionTitle }, 'Come Funziona'),
    e(View, { style: styles.cardHighlight },
      e(Text, { style: [styles.text, styles.bold] }, 'Peso → Punteggio continuo → Modificatori → Arrotondamento → Livello'),
      e(Text, { style: styles.textSmall }, 'Ogni componente (base, topper, cilindri) ha la propria scala e i propri modificatori proporzionali.')
    ),

    e(Text, { style: styles.subTitle }, 'Modificatori Topper (scala 1.0 — 6.0)'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Parametro', 'Valore', 'Parametro', 'Valore'], isHeader: true }),
      e(TableRow, { cells: ['Side sleeper', '-0.4', 'Prono', '+0.4'] }),
      e(TableRow, { cells: ['Accogliente', '-0.4', 'Sostenuto', '+0.4'] }),
      e(TableRow, { cells: ['Fibromialgia', '-0.3', 'Dolore lombare', '+0.15'] }),
      e(TableRow, { cells: ['Dolore spalle', '-0.2', 'Lordosi', '+0.15'] }),
      e(TableRow, { cells: ['Dolore anche', '-0.2', 'A-shape', '-0.15'] }),
      e(TableRow, { cells: ['Sciatica', '-0.2', 'V-shape', '-0.15'] }),
      e(TableRow, { cells: ['Cifosi', '-0.15', 'Guardrail max', '±1.0'] })
    ),

    e(Text, { style: styles.subTitle }, 'Modificatori Base (scala 1.0 — 3.0)'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Parametro', 'Valore', 'Parametro', 'Valore'], isHeader: true }),
      e(TableRow, { cells: ['Side sleeper', '-0.15', 'Prono', '+0.15'] }),
      e(TableRow, { cells: ['Accogliente', '-0.1', 'Sostenuto', '+0.1'] }),
      e(TableRow, { cells: ['Dolore lombare', '+0.2', 'Lordosi', '+0.2'] }),
      e(TableRow, { cells: ['Fibromialgia', '-0.15', '', ''] })
    ),

    e(Text, { style: styles.subTitle }, 'Modificatori Cilindri Lombare (scala 1.0 — 3.0)'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Parametro', 'Valore', 'Parametro', 'Valore'], isHeader: true }),
      e(TableRow, { cells: ['Side sleeper', '-0.2', 'Supino', '+0.2'] }),
      e(TableRow, { cells: ['Prono', '+0.3', 'Accogliente', '-0.15'] }),
      e(TableRow, { cells: ['Sostenuto', '+0.15', 'Dolore lombare', '+0.3'] }),
      e(TableRow, { cells: ['Lordosi', '+0.25', 'Sciatica', '-0.15'] }),
      e(TableRow, { cells: ['A-shape', '+0.1', '', ''] })
    ),

    e(Footer, { pageNum: 3 })
  );
}

// ============================================================================
// PAGE 4 — Vincoli, Accessori & Regole
// ============================================================================

function Page4() {
  return e(Page, { size: 'A4', style: styles.page },
    e(Header),
    e(Text, { style: styles.pageTitle }, 'Vincoli, Accessori & Regole'),

    e(Text, { style: styles.sectionTitle }, 'Vincoli Base ↔ Cilindri (PRO)'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Base', 'Spalle', 'Lombare', 'Gambe'], isHeader: true }),
      e(TableRow, { cells: ['Soft', 'SS, S, M', 'S, M', '= Spalle'] }),
      e(TableRow, { cells: ['Medium', 'SS, S, M, F', 'S, M, F', '= Spalle'] }),
      e(TableRow, { cells: ['Hard', 'SS, S, M, F', 'M, F', '= Spalle'] })
    ),
    e(Text, { style: styles.textSmall }, 'SS=Super Soft 6cm, S=Soft 8cm, M=Medium 8cm, F=Firm 8cm. Lombare: mai Super Soft. Lombare sempre ≥ spalle in rigidità. Spalle: Super Soft sempre ammesso.'),

    e(Text, { style: styles.sectionTitle }, 'Regole Cilindri Spalle'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Condizione', 'Cilindro spalle'], isHeader: true }),
      e(TableRow, { cells: ['<60kg + side sleeper + spalle strette', 'Nessun cilindro (cavità vuota)'] }),
      e(TableRow, { cells: ['60-90 kg (default)', 'Super Soft 6cm'] }),
      e(TableRow, { cells: ['>90 kg', 'Soft 8cm'] })
    ),
    e(Text, { style: styles.textSmall }, 'V-shape (spalle larghe) spinge verso opzione più morbida. Cilindri gambe sempre speculari alle spalle.'),

    e(Text, { style: styles.sectionTitle }, 'Cosa Configura Ogni Modello'),
    e(View, { style: styles.card },
      e(TableRow, { cells: ['Componente', 'ONE', 'PLUS', 'PRO'], isHeader: true }),
      e(TableRow, { cells: ['Topper', 'Fisso (5cm)', '6 livelli', '6 livelli'] }),
      e(TableRow, { cells: ['Base', '3 densità', '3 densità', '3 densità'] }),
      e(TableRow, { cells: ['Cilindri', '—', '—', '3 zone × 4 tipi'] }),
      e(TableRow, { cells: ['Scanalature', '✓', '✓', '—'] })
    ),

    e(Text, { style: styles.sectionTitle }, 'Consigli Accessori Automatici'),
    e(Text, { style: styles.subTitle }, 'Rete Motorizzata'),
    e(Text, { style: styles.text }, "L'algoritmo consiglia automaticamente la rete motorizzata se il cliente presenta:"),
    e(Bullet, null, 'Problemi circolatori'),
    e(Bullet, null, 'Dolore lombare'),
    e(Bullet, null, 'Russamento, reflusso o apnee notturne'),
    e(Bullet, null, 'Abitudine a leggere o guardare TV a letto'),

    e(Text, { style: styles.subTitle }, 'Cuscino AirSense'),
    e(Text, { style: styles.text }, 'Viscoelastico a cella iperaperta (500× più traspirante), lavabile. Dimensioni 65×40cm. 4 strati con inserti centrali removibili per regolare l\'altezza. Due lati cervicali: curva dolce e curva pronunciata.'),
    e(View, { style: styles.card },
      e(Bullet, null, 'Altezza: basata su larghezza spalle (body shape) + posizione di sonno. Side sleeper = cuscino più alto.'),
      e(Bullet, null, 'Lato cervicale: curva pronunciata se dolore cervicale, curva dolce altrimenti.')
    ),

    e(View, { style: [styles.cardHighlight, { marginTop: 12 }] },
      e(Text, { style: [styles.text, styles.bold] }, "Regola d'oro dell'algoritmo"),
      e(Text, { style: styles.text }, 'Il peso fissa il range ammesso → i modificatori (posizione, preferenza, problematiche, body shape) regolano la posizione dentro quel range → il guardrail impedisce scostamenti > ±1.0 livello dal punteggio peso → il risultato è sempre sicuro e personalizzato.')
    ),

    e(View, { style: [styles.card, { marginTop: 8 }] },
      e(Text, { style: [styles.text, styles.bold] }, 'DualComfort™ — Materassi sempre singoli'),
      e(Text, { style: styles.text }, "Anche nel letto matrimoniale, i materassi sono sempre singoli accostati. Ogni partner ha la propria analisi e configurazione indipendente. L'analisi nel CRM supporta coppie con 2 schede separate per lead.")
    ),

    e(Footer, { pageNum: 4 })
  );
}

// ============================================================================
// Generate PDF
// ============================================================================

const doc = e(Document, {
  title: 'Doctorbed — Panoramica Prodotti & Algoritmo',
  author: 'Doctorbed',
  subject: 'Documento di riferimento per consulenti',
},
  e(Page1),
  e(Page2),
  e(Page3),
  e(Page4)
);

const outputPath = new URL('../docs/Doctorbed_Panoramica_Prodotti.pdf', import.meta.url).pathname;

console.log('Generazione PDF in corso...');
await renderToFile(doc, outputPath);
console.log(`✅ PDF generato: ${outputPath}`);
