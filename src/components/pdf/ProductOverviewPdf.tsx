'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ============================================================================
// Styles
// ============================================================================

const colors = {
  primary: '#1e3a5f',       // Doctorbed blu scuro
  primaryLight: '#3b6fa0',
  accent: '#4a90d9',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray600: '#525252',
  gray800: '#262626',
  white: '#ffffff',
  softBlue: '#b3d4fc',
  mediumBlue: '#6ba3e8',
  firmBlue: '#2563eb',
  darkBlue: '#1e40af',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: colors.gray800,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  brandName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 8,
    color: colors.gray600,
    marginTop: 2,
  },
  docDate: {
    fontSize: 8,
    color: colors.gray400,
  },
  // Titles
  pageTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 6,
    marginTop: 14,
  },
  subTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray800,
    marginBottom: 4,
    marginTop: 8,
  },
  // Content
  text: {
    fontSize: 9,
    lineHeight: 1.5,
    color: colors.gray800,
  },
  textSmall: {
    fontSize: 8,
    lineHeight: 1.4,
    color: colors.gray600,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  // Cards / Boxes
  card: {
    backgroundColor: colors.gray100,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  cardHighlight: {
    backgroundColor: '#eef4fb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  // Tables
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 5,
    backgroundColor: colors.gray100,
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    paddingHorizontal: 4,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
    color: colors.primary,
  },
  // Model cards
  modelCard: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    width: '100%',
  },
  modelName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  // Layers visualization
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  layerColor: {
    width: 16,
    height: 10,
    borderRadius: 2,
    marginRight: 6,
  },
  // Columns
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col2: {
    flex: 1,
  },
  col3: {
    width: '32%',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: colors.gray300,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: colors.gray400,
  },
  // Bullet
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8,
  },
  bullet: {
    width: 10,
    fontSize: 9,
    color: colors.gray600,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
  },
});

// ============================================================================
// Helper Components
// ============================================================================

function Header() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brandName}>doctorbed</Text>
        <Text style={styles.brandTagline}>
          Il materasso che si adatta a te. Non il contrario.
        </Text>
      </View>
      <View>
        <Text style={styles.docDate}>Documento Riservato</Text>
        <Text style={styles.docDate}>
          {new Date().toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
}

function Footer({ pageNum }: { pageNum: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Doctorbed — Dispositivo Medico Classe I
      </Text>
      <Text style={styles.footerText}>
        Panoramica Prodotti & Algoritmo — Pag. {pageNum}
      </Text>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

// ============================================================================
// PAGE 1 — Cover + Overview Modelli
// ============================================================================

function Page1() {
  return (
    <Page size="A4" style={styles.page}>
      <Header />

      <Text style={styles.pageTitle}>
        Panoramica Prodotti & Tecnologia
      </Text>

      <Text style={styles.text}>
        Doctorbed è l&apos;unico sistema letto in Europa completamente
        personalizzabile. Ogni materasso è configurato sulle caratteristiche
        fisiche del cliente: peso, altezza, forma del corpo, posizione di
        sonno e preferenze personali. Certificato Dispositivo Medico Classe I.
      </Text>

      {/* Struttura Universale */}
      <Text style={styles.sectionTitle}>Struttura Universale — 23cm</Text>

      <Text style={styles.text}>
        Tutti i modelli condividono la stessa architettura a strati e la stessa
        cover. Altezza totale: 23cm per ogni modello.
      </Text>

      <View style={styles.card}>
        <View style={styles.layerRow}>
          <View style={[styles.layerColor, { backgroundColor: '#e0e7ef' }]} />
          <Text style={styles.text}>
            <Text style={styles.bold}>Cover superiore</Text> — Tessuto tecnico
            fresco, antiallergico, traspirante
          </Text>
        </View>
        <View style={styles.layerRow}>
          <View style={[styles.layerColor, { backgroundColor: '#d4c96a' }]} />
          <Text style={styles.text}>
            <Text style={styles.bold}>Topper (ZeroGravity™)</Text> —
            Viscoelastico a cella aperta. 5cm (ONE) o 8cm (PLUS/PRO)
          </Text>
        </View>
        <View style={styles.layerRow}>
          <View style={[styles.layerColor, { backgroundColor: '#9ca3af' }]} />
          <Text style={styles.text}>
            <Text style={styles.bold}>Base (SmartBase™)</Text> — Poliuretano HR
            ad alta resilienza. 17cm (ONE) o 14cm (PLUS/PRO)
          </Text>
        </View>
        <View style={styles.layerRow}>
          <View style={[styles.layerColor, { backgroundColor: '#d1d5db' }]} />
          <Text style={styles.text}>
            <Text style={styles.bold}>Cover inferiore</Text> — Tessuto 3D super
            traspirante + fascia laterale imbottita con maniglie
          </Text>
        </View>
        <Text style={styles.textSmall}>
          Cerniera tra topper e base per sfoderamento completo.
        </Text>
      </View>

      {/* 3 Modelli */}
      <Text style={styles.sectionTitle}>Tre Livelli di Personalizzazione</Text>

      {/* ONE */}
      <View style={styles.modelCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={styles.modelName}>Modularbed ONE</Text>
          <Text style={styles.badge}>3 Regolazioni</Text>
        </View>
        <Text style={styles.text}>
          Topper fisso 5cm (2,5cm soft + 2,5cm hard). Base 17cm con scanalature
          ergonomiche in 3 densità (Soft / Medium / Hard). DualComfort™ per
          regolazione indipendente per lato.
        </Text>
        <Text style={styles.textSmall}>
          Ideale per coppie con esigenze simili che cercano un sostegno
          equilibrato.
        </Text>
      </View>

      {/* PLUS */}
      <View style={styles.modelCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={styles.modelName}>Modularbed PLUS</Text>
          <Text style={styles.badge}>18 Regolazioni</Text>
        </View>
        <Text style={styles.text}>
          Topper 8cm configurabile in 6 rigidità. Base 14cm con scanalature
          ergonomiche in 3 densità. 6 topper × 3 basi = 18 combinazioni per
          lato. DualComfort™.
        </Text>
        <Text style={styles.textSmall}>
          Pensato per coppie con esigenze diverse che vogliono una regolazione
          precisa.
        </Text>
      </View>

      {/* PRO */}
      <View style={styles.modelCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={styles.modelName}>Modularbed PRO</Text>
          <Text style={styles.badge}>Regolazioni illimitate</Text>
        </View>
        <Text style={styles.text}>
          Topper 8cm (6 rigidità) + Base 14cm (3 densità) + TubeLayer System™
          con 10 cilindri modulari in 3 zone personalizzabili (4 tipi di
          cilindro). DualComfort™.
        </Text>
        <Text style={styles.textSmall}>
          Per chi ha esigenze complesse, dolori specifici o cerca il massimo
          controllo.
        </Text>
      </View>

      <Footer pageNum={1} />
    </Page>
  );
}

// ============================================================================
// PAGE 2 — Materiali & Specifiche Tecniche
// ============================================================================

function Page2() {
  return (
    <Page size="A4" style={styles.page}>
      <Header />

      <Text style={styles.pageTitle}>Materiali & Specifiche Tecniche</Text>

      {/* Perché materiali espansi */}
      <Text style={styles.sectionTitle}>Scelta dei Materiali</Text>
      <Text style={styles.text}>
        Doctorbed utilizza esclusivamente materiali espansi di alta qualità,
        superiori a molle (micropressioni, usura, rumore, incompatibilità con
        reti motorizzate) e lattice (pesante, costoso, si sgrétola nel tempo).
      </Text>

      {/* Topper materials */}
      <Text style={styles.sectionTitle}>Materiali Topper (ZeroGravity™)</Text>
      <Text style={styles.text}>
        Il topper è composto da 2 strati di viscoelastico a cella aperta (10×
        più traspirante del memory tradizionale) combinati in proporzioni
        diverse per creare 6 livelli di rigidità.
      </Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Materiale</Text>
          <Text style={styles.tableCellHeader}>Densità</Text>
          <Text style={styles.tableCellHeader}>kPa</Text>
          <Text style={styles.tableCellHeader}>Funzione</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Visco Soft</Text>
          <Text style={styles.tableCell}>50-60 kg/m³</Text>
          <Text style={styles.tableCell}>2.5-4</Text>
          <Text style={styles.tableCell}>Comfort, dissipa pressione</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Visco Hard</Text>
          <Text style={styles.tableCell}>60-75 kg/m³</Text>
          <Text style={styles.tableCell}>5.5-8</Text>
          <Text style={styles.tableCell}>Transizione, sostegno</Text>
        </View>
      </View>

      {/* 6 Topper levels */}
      <Text style={styles.subTitle}>6 Livelli di Rigidità Topper (8cm — PLUS & PRO)</Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Liv.</Text>
          <Text style={styles.tableCellHeader}>Composizione</Text>
          <Text style={styles.tableCellHeader}>Range peso</Text>
          <Text style={styles.tableCellHeader}>Sensazione</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>1</Text>
          <Text style={styles.tableCell}>8cm Soft</Text>
          <Text style={styles.tableCell}>40-55 kg</Text>
          <Text style={styles.tableCell}>Ultra morbido</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>2</Text>
          <Text style={styles.tableCell}>6cm Soft + 2cm Hard</Text>
          <Text style={styles.tableCell}>50-65 kg</Text>
          <Text style={styles.tableCell}>Morbido</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>3</Text>
          <Text style={styles.tableCell}>4cm Soft + 4cm Hard</Text>
          <Text style={styles.tableCell}>60-80 kg</Text>
          <Text style={styles.tableCell}>Medio</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>4</Text>
          <Text style={styles.tableCell}>2cm Soft + 6cm Hard</Text>
          <Text style={styles.tableCell}>75-90 kg</Text>
          <Text style={styles.tableCell}>Sostenuto</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>5</Text>
          <Text style={styles.tableCell}>8cm Hard</Text>
          <Text style={styles.tableCell}>85-110 kg</Text>
          <Text style={styles.tableCell}>Rigido</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>6</Text>
          <Text style={styles.tableCell}>4cm Hard + 4cm HR</Text>
          <Text style={styles.tableCell}>105-140+ kg</Text>
          <Text style={styles.tableCell}>Ultra rigido</Text>
        </View>
      </View>

      <Text style={styles.textSmall}>
        ONE: topper fisso 5cm (2,5cm Soft + 2,5cm Hard). Lo strato Soft è
        sempre sopra (lato corpo).
      </Text>

      {/* Base materials */}
      <Text style={styles.sectionTitle}>Materiali Base (SmartBase™)</Text>
      <Text style={styles.text}>
        Poliuretano HR (alta resilienza) con scanalature ergonomiche (ONE &
        PLUS) o cavità per cilindri (PRO). 3 densità selezionabili.
      </Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Densità</Text>
          <Text style={styles.tableCellHeader}>kg/m³</Text>
          <Text style={styles.tableCellHeader}>kPa</Text>
          <Text style={styles.tableCellHeader}>Range peso</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Soft</Text>
          <Text style={styles.tableCell}>35-40</Text>
          <Text style={styles.tableCell}>2.5-3.5</Text>
          <Text style={styles.tableCell}>45-70 kg</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Medium</Text>
          <Text style={styles.tableCell}>40-50</Text>
          <Text style={styles.tableCell}>4-5.5</Text>
          <Text style={styles.tableCell}>65-95 kg</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Hard</Text>
          <Text style={styles.tableCell}>50-60</Text>
          <Text style={styles.tableCell}>6-8</Text>
          <Text style={styles.tableCell}>90-130+ kg</Text>
        </View>
      </View>

      {/* Cylinder materials */}
      <Text style={styles.sectionTitle}>Cilindri TubeLayer System™ (solo PRO)</Text>
      <Text style={styles.text}>
        10 cilindri modulari HR distribuiti in 3 zone (3 spalle + 4 lombare + 3
        gambe). Incassati nella parte superiore della base (8cm). 4 tipi
        intercambiabili.
      </Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Tipo</Text>
          <Text style={styles.tableCellHeader}>Ø cm</Text>
          <Text style={styles.tableCellHeader}>kg/m³</Text>
          <Text style={styles.tableCellHeader}>kPa</Text>
          <Text style={styles.tableCellHeader}>Uso tipico</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Super Soft</Text>
          <Text style={styles.tableCell}>6</Text>
          <Text style={styles.tableCell}>25-30</Text>
          <Text style={styles.tableCell}>1.8-2.5</Text>
          <Text style={styles.tableCell}>Spalle (default)</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Soft</Text>
          <Text style={styles.tableCell}>8</Text>
          <Text style={styles.tableCell}>25-30</Text>
          <Text style={styles.tableCell}>1.8-2.5</Text>
          <Text style={styles.tableCell}>Spalle pesanti</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Medium</Text>
          <Text style={styles.tableCell}>8</Text>
          <Text style={styles.tableCell}>40-50</Text>
          <Text style={styles.tableCell}>4-5.5</Text>
          <Text style={styles.tableCell}>Lombare standard</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Firm</Text>
          <Text style={styles.tableCell}>8</Text>
          <Text style={styles.tableCell}>50-60</Text>
          <Text style={styles.tableCell}>6-8</Text>
          <Text style={styles.tableCell}>Lombare robusti</Text>
        </View>
      </View>

      <Text style={styles.textSmall}>
        Zone: Spalle (~55cm, 3 cilindri) — Lombare/Bacino (~70cm, 4 cilindri) —
        Gambe (~55cm, 3 cilindri). Gambe speculare a spalle.
      </Text>

      <Footer pageNum={2} />
    </Page>
  );
}

// ============================================================================
// PAGE 3 — Algoritmo di Configurazione
// ============================================================================

function Page3() {
  return (
    <Page size="A4" style={styles.page}>
      <Header />

      <Text style={styles.pageTitle}>Algoritmo di Configurazione</Text>

      <Text style={styles.text}>
        L&apos;algoritmo analizza 7 parametri del cliente per generare
        automaticamente la configurazione ideale per ciascun modello. Il
        peso è il parametro primario che limita il range ammesso, gli altri
        parametri regolano la posizione all&apos;interno di quel range.
      </Text>

      {/* 7 Parametri */}
      <Text style={styles.sectionTitle}>7 Parametri dell&apos;Anamnesi</Text>

      <View style={styles.row}>
        <View style={styles.col2}>
          <Bullet>Sesso (M/F)</Bullet>
          <Bullet>Peso (kg)</Bullet>
          <Bullet>Altezza (cm)</Bullet>
          <Bullet>Body shape (silhouette selezionabile)</Bullet>
        </View>
        <View style={styles.col2}>
          <Bullet>Posizione di sonno (lato/supino/prono/misto)</Bullet>
          <Bullet>Preferenza rigidità (accogliente/neutro/sostenuto)</Bullet>
          <Bullet>Problematiche (multi-selezione)</Bullet>
        </View>
      </View>

      {/* Come funziona */}
      <Text style={styles.sectionTitle}>Come Funziona</Text>

      <View style={styles.cardHighlight}>
        <Text style={[styles.text, styles.bold]}>
          Peso → Punteggio continuo → Modificatori → Arrotondamento → Livello
        </Text>
        <Text style={styles.textSmall}>
          Ogni componente (base, topper, cilindri) ha la propria scala e i
          propri modificatori proporzionali.
        </Text>
      </View>

      {/* Topper modifiers */}
      <Text style={styles.subTitle}>Modificatori Topper (scala 1.0 — 6.0)</Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Parametro</Text>
          <Text style={styles.tableCellHeader}>Valore</Text>
          <Text style={styles.tableCellHeader}>Parametro</Text>
          <Text style={styles.tableCellHeader}>Valore</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Side sleeper</Text>
          <Text style={styles.tableCell}>-0.4</Text>
          <Text style={styles.tableCell}>Prono</Text>
          <Text style={styles.tableCell}>+0.4</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Accogliente</Text>
          <Text style={styles.tableCell}>-0.4</Text>
          <Text style={styles.tableCell}>Sostenuto</Text>
          <Text style={styles.tableCell}>+0.4</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Fibromialgia</Text>
          <Text style={styles.tableCell}>-0.3</Text>
          <Text style={styles.tableCell}>Dolore lombare</Text>
          <Text style={styles.tableCell}>+0.15</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Dolore spalle</Text>
          <Text style={styles.tableCell}>-0.2</Text>
          <Text style={styles.tableCell}>Lordosi</Text>
          <Text style={styles.tableCell}>+0.15</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Dolore anche</Text>
          <Text style={styles.tableCell}>-0.2</Text>
          <Text style={styles.tableCell}>A-shape</Text>
          <Text style={styles.tableCell}>-0.15</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Sciatica</Text>
          <Text style={styles.tableCell}>-0.2</Text>
          <Text style={styles.tableCell}>V-shape</Text>
          <Text style={styles.tableCell}>-0.15</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Cifosi</Text>
          <Text style={styles.tableCell}>-0.15</Text>
          <Text style={styles.tableCell}>Guardrail max</Text>
          <Text style={styles.tableCell}>±1.0</Text>
        </View>
      </View>

      {/* Base modifiers */}
      <Text style={styles.subTitle}>Modificatori Base (scala 1.0 — 3.0)</Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Parametro</Text>
          <Text style={styles.tableCellHeader}>Valore</Text>
          <Text style={styles.tableCellHeader}>Parametro</Text>
          <Text style={styles.tableCellHeader}>Valore</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Side sleeper</Text>
          <Text style={styles.tableCell}>-0.15</Text>
          <Text style={styles.tableCell}>Prono</Text>
          <Text style={styles.tableCell}>+0.15</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Accogliente</Text>
          <Text style={styles.tableCell}>-0.1</Text>
          <Text style={styles.tableCell}>Sostenuto</Text>
          <Text style={styles.tableCell}>+0.1</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Dolore lombare</Text>
          <Text style={styles.tableCell}>+0.2</Text>
          <Text style={styles.tableCell}>Lordosi</Text>
          <Text style={styles.tableCell}>+0.2</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Fibromialgia</Text>
          <Text style={styles.tableCell}>-0.15</Text>
          <Text style={styles.tableCell}></Text>
          <Text style={styles.tableCell}></Text>
        </View>
      </View>

      {/* Lumbar modifiers */}
      <Text style={styles.subTitle}>Modificatori Cilindri Lombare (scala 1.0 — 3.0)</Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Parametro</Text>
          <Text style={styles.tableCellHeader}>Valore</Text>
          <Text style={styles.tableCellHeader}>Parametro</Text>
          <Text style={styles.tableCellHeader}>Valore</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Side sleeper</Text>
          <Text style={styles.tableCell}>-0.2</Text>
          <Text style={styles.tableCell}>Supino</Text>
          <Text style={styles.tableCell}>+0.2</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Prono</Text>
          <Text style={styles.tableCell}>+0.3</Text>
          <Text style={styles.tableCell}>Accogliente</Text>
          <Text style={styles.tableCell}>-0.15</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Sostenuto</Text>
          <Text style={styles.tableCell}>+0.15</Text>
          <Text style={styles.tableCell}>Dolore lombare</Text>
          <Text style={styles.tableCell}>+0.3</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Lordosi</Text>
          <Text style={styles.tableCell}>+0.25</Text>
          <Text style={styles.tableCell}>Sciatica</Text>
          <Text style={styles.tableCell}>-0.15</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>A-shape</Text>
          <Text style={styles.tableCell}>+0.1</Text>
          <Text style={styles.tableCell}></Text>
          <Text style={styles.tableCell}></Text>
        </View>
      </View>

      <Footer pageNum={3} />
    </Page>
  );
}

// ============================================================================
// PAGE 4 — Vincoli, Accessori & Regole
// ============================================================================

function Page4() {
  return (
    <Page size="A4" style={styles.page}>
      <Header />

      <Text style={styles.pageTitle}>Vincoli, Accessori & Regole</Text>

      {/* Vincoli base-cilindri */}
      <Text style={styles.sectionTitle}>Vincoli Base ↔ Cilindri (PRO)</Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Base</Text>
          <Text style={styles.tableCellHeader}>Spalle</Text>
          <Text style={styles.tableCellHeader}>Lombare</Text>
          <Text style={styles.tableCellHeader}>Gambe</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.bold]}>Soft</Text>
          <Text style={styles.tableCell}>SS, S, M</Text>
          <Text style={styles.tableCell}>S, M</Text>
          <Text style={styles.tableCell}>= Spalle</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.bold]}>Medium</Text>
          <Text style={styles.tableCell}>SS, S, M, F</Text>
          <Text style={styles.tableCell}>S, M, F</Text>
          <Text style={styles.tableCell}>= Spalle</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.bold]}>Hard</Text>
          <Text style={styles.tableCell}>SS, S, M, F</Text>
          <Text style={styles.tableCell}>M, F</Text>
          <Text style={styles.tableCell}>= Spalle</Text>
        </View>
      </View>

      <Text style={styles.textSmall}>
        SS=Super Soft 6cm, S=Soft 8cm, M=Medium 8cm, F=Firm 8cm. Lombare: mai
        Super Soft. Lombare sempre ≥ spalle in rigidità. Spalle: Super Soft
        sempre ammesso (anche con base Hard).
      </Text>

      {/* Regole cilindri spalle */}
      <Text style={styles.sectionTitle}>Regole Cilindri Spalle</Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Condizione</Text>
          <Text style={styles.tableCellHeader}>Cilindro spalle</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>{'<'}60kg + side sleeper + spalle strette</Text>
          <Text style={styles.tableCell}>Nessun cilindro (cavità vuota)</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>60-90 kg (default)</Text>
          <Text style={styles.tableCell}>Super Soft 6cm</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>{'>'}90 kg</Text>
          <Text style={styles.tableCell}>Soft 8cm</Text>
        </View>
      </View>

      <Text style={styles.textSmall}>
        V-shape (spalle larghe) spinge verso opzione più morbida. Cilindri
        gambe sempre speculari alle spalle.
      </Text>

      {/* Configurazione per modello */}
      <Text style={styles.sectionTitle}>Cosa Configura Ogni Modello</Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Componente</Text>
          <Text style={styles.tableCellHeader}>ONE</Text>
          <Text style={styles.tableCellHeader}>PLUS</Text>
          <Text style={styles.tableCellHeader}>PRO</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.bold]}>Topper</Text>
          <Text style={styles.tableCell}>Fisso (5cm)</Text>
          <Text style={styles.tableCell}>6 livelli</Text>
          <Text style={styles.tableCell}>6 livelli</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.bold]}>Base</Text>
          <Text style={styles.tableCell}>3 densità</Text>
          <Text style={styles.tableCell}>3 densità</Text>
          <Text style={styles.tableCell}>3 densità</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.bold]}>Cilindri</Text>
          <Text style={styles.tableCell}>—</Text>
          <Text style={styles.tableCell}>—</Text>
          <Text style={styles.tableCell}>3 zone × 4 tipi</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.bold]}>Scanalature</Text>
          <Text style={styles.tableCell}>✓</Text>
          <Text style={styles.tableCell}>✓</Text>
          <Text style={styles.tableCell}>—</Text>
        </View>
      </View>

      {/* Accessori */}
      <Text style={styles.sectionTitle}>Consigli Accessori Automatici</Text>

      <Text style={styles.subTitle}>Rete Motorizzata</Text>
      <Text style={styles.text}>
        L&apos;algoritmo consiglia automaticamente la rete motorizzata se il
        cliente presenta:
      </Text>
      <Bullet>Problemi circolatori</Bullet>
      <Bullet>Dolore lombare</Bullet>
      <Bullet>Russamento, reflusso o apnee notturne</Bullet>
      <Bullet>Abitudine a leggere o guardare TV a letto</Bullet>

      <Text style={styles.subTitle}>Cuscino AirSense</Text>
      <Text style={styles.text}>
        Viscoelastico a cella iperaperta (500× più traspirante), lavabile.
        Dimensioni 65×40cm. 4 strati con inserti centrali removibili per
        regolare l&apos;altezza. Due lati cervicali: curva dolce e curva
        pronunciata.
      </Text>

      <View style={styles.card}>
        <Bullet>Altezza: basata su larghezza spalle (body shape) + posizione di sonno. Side sleeper = cuscino più alto.</Bullet>
        <Bullet>Lato cervicale: curva pronunciata se dolore cervicale, curva dolce altrimenti.</Bullet>
      </View>

      {/* Regola d'oro */}
      <View style={[styles.cardHighlight, { marginTop: 12 }]}>
        <Text style={[styles.text, styles.bold]}>
          Regola d&apos;oro dell&apos;algoritmo
        </Text>
        <Text style={styles.text}>
          Il peso fissa il range ammesso → i modificatori (posizione,
          preferenza, problematiche, body shape) regolano la posizione dentro
          quel range → il guardrail impedisce scostamenti {'>'} ±1.0 livello dal
          punteggio peso → il risultato è sempre sicuro e personalizzato.
        </Text>
      </View>

      {/* DualComfort */}
      <View style={[styles.card, { marginTop: 8 }]}>
        <Text style={[styles.text, styles.bold]}>
          DualComfort™ — Materassi sempre singoli
        </Text>
        <Text style={styles.text}>
          Anche nel letto matrimoniale, i materassi sono sempre singoli
          accostati. Ogni partner ha la propria analisi e configurazione
          indipendente. L&apos;analisi nel CRM supporta coppie con 2 schede
          separate per lead.
        </Text>
      </View>

      <Footer pageNum={4} />
    </Page>
  );
}

// ============================================================================
// Main Document
// ============================================================================

export function ProductOverviewPdf() {
  return (
    <Document
      title="Doctorbed — Panoramica Prodotti & Algoritmo"
      author="Doctorbed"
      subject="Documento di riferimento per consulenti"
    >
      <Page1 />
      <Page2 />
      <Page3 />
      <Page4 />
    </Document>
  );
}
