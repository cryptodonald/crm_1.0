import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { LeadAnalysis, LeadAnalysisConfig } from '@/types/database';

const colors = {
  primary: '#1e3a5f',
  accent: '#4a90d9',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray400: '#a3a3a3',
  gray600: '#525252',
  gray800: '#262626',
  white: '#ffffff',
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: colors.gray800 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: colors.primary },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: colors.primary },
  date: { fontSize: 8, color: colors.gray400 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 10 },
  section: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 5, marginTop: 12 },
  text: { fontSize: 9, lineHeight: 1.5 },
  bold: { fontFamily: 'Helvetica-Bold' },
  card: { backgroundColor: colors.gray100, borderRadius: 4, padding: 8, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: colors.gray200 },
  label: { fontSize: 8, color: colors.gray600 },
  value: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  cols3: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  modelTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 4 },
  badge: { backgroundColor: colors.primary, color: colors.white, fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: colors.gray200, paddingTop: 4 },
  footerText: { fontSize: 7, color: colors.gray400 },
});

const BODY_LABELS: Record<string, string> = { v_shape: 'V-Shape', a_shape: 'A-Shape', normal: 'Normale', h_shape: 'H-Shape', round: 'Rotondo' };
const BODY_TYPE_LABELS: Record<string, string> = { slim: 'Esile', average: 'Normale', athletic: 'Atletico', heavy: 'Robusto' };
const SLEEP_LABELS: Record<string, string> = { side: 'Laterale', supine: 'Supino', prone: 'Prono' };
const FIRMNESS_LABELS: Record<string, string> = { soft: 'Accogliente', neutral: 'Neutro', firm: 'Sostenuto' };
const HEALTH_LABELS: Record<string, string> = { lower_back_pain: 'Dolore lombare', shoulder_pain: 'Dolore spalle', hip_pain: 'Dolore anche', lordosis: 'Lordosi', kyphosis: 'Cifosi', fibromyalgia: 'Fibromialgia' };
const BASE_LABELS: Record<string, string> = { soft: 'Soft', medium: 'Medium', hard: 'Hard' };
const TOPPER_LABELS: Record<number, string> = { 1: 'L1 — Ultra morbido', 2: 'L2 — Morbido', 3: 'L3 — Medio', 4: 'L4 — Sostenuto', 5: 'L5 — Rigido', 6: 'L6 — Ultra rigido' };
const CYL_LABELS: Record<string, string> = { none: 'Nessuno', super_soft_6: 'Super Soft 6cm', soft_8: 'Soft 8cm', medium_8: 'Medium 8cm', firm_8: 'Firm 8cm' };

// ---- Mattress Layer Cross-Section Diagram ----

const layerPalette = {
  cover: '#dfe6ed',
  viscoSoft: '#edc755',
  viscoHard: '#c9a022',
  hr: '#a0845a',
  baseSoft: '#c0d4e8',
  baseMed: '#8fa8c0',
  baseHard: '#5f7f99',
  cylZone: '#7ab5d4',
  coverBot: '#cdd3d9',
};

const DIAGRAM_H = 95;

interface LDef { label: string; cm: number; color: string }

function topperLayers(level: number, isOne: boolean): LDef[] {
  if (isOne) {
    return [
      { label: 'Visco Soft 2,5cm', cm: 2.5, color: layerPalette.viscoSoft },
      { label: 'Visco Hard 2,5cm', cm: 2.5, color: layerPalette.viscoHard },
    ];
  }
  const c: Record<number, LDef[]> = {
    1: [{ label: 'Visco Soft 8cm', cm: 8, color: layerPalette.viscoSoft }],
    2: [{ label: 'Visco Soft 6cm', cm: 6, color: layerPalette.viscoSoft }, { label: 'Visco Hard 2cm', cm: 2, color: layerPalette.viscoHard }],
    3: [{ label: 'Visco Soft 4cm', cm: 4, color: layerPalette.viscoSoft }, { label: 'Visco Hard 4cm', cm: 4, color: layerPalette.viscoHard }],
    4: [{ label: 'Visco Soft 2cm', cm: 2, color: layerPalette.viscoSoft }, { label: 'Visco Hard 6cm', cm: 6, color: layerPalette.viscoHard }],
    5: [{ label: 'Visco Hard 8cm', cm: 8, color: layerPalette.viscoHard }],
    6: [{ label: 'Visco Hard 4cm', cm: 4, color: layerPalette.viscoHard }, { label: 'HR 4cm', cm: 4, color: layerPalette.hr }],
  };
  return c[level] || c[3];
}

function baseColor(d: string) {
  return d === 'soft' ? layerPalette.baseSoft : d === 'hard' ? layerPalette.baseHard : layerPalette.baseMed;
}

function buildModelLayers(cfg: LeadAnalysisConfig): LDef[] {
  const isOne = cfg.model === 'one';
  const baseCm = isOne ? 17 : 14;
  const out: LDef[] = [{ label: 'Cover', cm: 0.5, color: layerPalette.cover }];
  out.push(...topperLayers(cfg.topper_level, isOne));
  if (cfg.model === 'pro') {
    out.push({ label: 'Cilindri 8cm', cm: 8, color: layerPalette.cylZone });
    out.push({ label: `Base ${BASE_LABELS[cfg.base_density]} 6cm`, cm: 6, color: baseColor(cfg.base_density) });
  } else {
    out.push({ label: `Base ${BASE_LABELS[cfg.base_density]} ${baseCm}cm`, cm: baseCm, color: baseColor(cfg.base_density) });
  }
  out.push({ label: 'Cover 3D', cm: 0.5, color: layerPalette.coverBot });
  return out;
}

const MODEL_NAMES: Record<string, string> = { one: 'ONE', plus: 'PLUS', pro: 'PRO' };

function MattressLayerDiagram({ config }: { config: LeadAnalysisConfig }) {
  const layers = buildModelLayers(config);
  const totalCm = layers.reduce((sum, l) => sum + l.cm, 0);

  return (
    <View style={s.col}>
      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 3, textAlign: 'center' }}>
        {MODEL_NAMES[config.model]}
      </Text>
      <View style={{ borderWidth: 0.5, borderColor: colors.gray200, borderRadius: 2, overflow: 'hidden' }}>
        {layers.map((layer, i) => {
          const h = Math.max(2, Math.round((layer.cm / totalCm) * DIAGRAM_H));
          return (
            <View key={`${config.model}-${i}`} style={{ height: h, backgroundColor: layer.color, justifyContent: 'center', paddingHorizontal: 3 }}>
              {h >= 8 && layer.label ? <Text style={{ fontSize: 5.5, color: '#333' }}>{layer.label}</Text> : null}
            </View>
          );
        })}
      </View>
      <Text style={{ fontSize: 6, color: colors.gray400, textAlign: 'center', marginTop: 2 }}>23cm</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function ConfigBlock({ config, isOne }: { config: LeadAnalysisConfig; isOne?: boolean }) {
  const modelNames: Record<string, string> = { one: 'ONE', plus: 'PLUS', pro: 'PRO' };

  return (
    <View style={[s.card, s.col]}>
      <Text style={s.modelTitle}>{modelNames[config.model]}</Text>
      <InfoRow label="Base" value={BASE_LABELS[config.base_density] || config.base_density} />
      <InfoRow
        label="Topper"
        value={isOne ? 'Fisso 5cm' : (TOPPER_LABELS[config.topper_level] || `L${config.topper_level}`)}
      />
      {config.model === 'pro' && (
        <>
          <InfoRow label="Spalle" value={CYL_LABELS[config.cylinder_shoulders || 'none']} />
          <InfoRow label="Lombare" value={CYL_LABELS[config.cylinder_lumbar || 'none']} />
          <InfoRow label="Gambe" value={CYL_LABELS[config.cylinder_legs || 'none']} />
        </>
      )}
      {config.recommend_motorized_base && (
        <Text style={[s.text, { marginTop: 4, color: colors.accent }]}>✓ Rete motorizzata consigliata</Text>
      )}
      {config.recommend_pillow && (
        <Text style={[s.text, { marginTop: 2, color: colors.accent }]}>
          ✓ Cuscino: {config.pillow_height_inserts} inserti, lato {config.pillow_cervical_side === 'pronounced' ? 'pronunciato' : 'dolce'}
        </Text>
      )}
    </View>
  );
}

interface Props {
  analysis: LeadAnalysis;
  leadName?: string;
  bodyModelImageUrl?: string;
}

export function AnalysisPdfDocument({ analysis, leadName, bodyModelImageUrl }: Props) {
  const configs = analysis.configs || [];
  const oneConfig = configs.find(c => c.model === 'one');
  const plusConfig = configs.find(c => c.model === 'plus');
  const proConfig = configs.find(c => c.model === 'pro');

  return (
    <Document
      title={`Analisi ${analysis.person_label}`}
      author="Doctorbed"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Image src="/logo/doctorbed-logo.png" style={{ width: 130, height: 20 }} />
            <Text style={[s.date, { marginTop: 3 }]}>Scheda Analisi Personalizzata</Text>
          </View>
          <View>
            <Text style={s.date}>
              {new Date(analysis.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Client info */}
        <Text style={s.title}>
          {leadName ? `${leadName} — ` : ''}{analysis.person_label}
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Left: client data */}
          <View style={[s.card, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <View style={{ flex: 1 }}>
                <InfoRow label="Sesso" value={analysis.sex === 'male' ? 'Uomo' : 'Donna'} />
                <InfoRow label="Peso" value={`${analysis.weight_kg} kg`} />
                <InfoRow label="Altezza" value={`${analysis.height_cm} cm`} />
                {analysis.age_years && <InfoRow label="Età" value={`${analysis.age_years} anni`} />}
                <InfoRow label="Muscolatura" value={BODY_TYPE_LABELS[analysis.body_type || 'average']} />
                <InfoRow label="Forma corpo" value={BODY_LABELS[analysis.body_shape || 'normal']} />
              </View>
              <View style={{ flex: 1 }}>
                <InfoRow label="Posizione sonno" value={
                  Array.isArray(analysis.sleep_position) && analysis.sleep_position.length > 0
                    ? analysis.sleep_position.map(p => SLEEP_LABELS[p] || p).join(', ')
                    : 'N/D'
                } />
                <InfoRow label="Preferenza" value={FIRMNESS_LABELS[analysis.firmness_preference]} />
                <InfoRow
                  label="Problematiche"
                  value={
                    analysis.health_issues.length > 0
                      ? analysis.health_issues.map(h => HEALTH_LABELS[h] || h).join(', ')
                      : 'Nessuna'
                  }
                />
              </View>
            </View>
          </View>
          {/* Right: 3D body model */}
          {bodyModelImageUrl && (
            <View style={{ width: 140, alignItems: 'center' }}>
              <Image src={bodyModelImageUrl} style={{ width: 130, height: 180, objectFit: 'contain' }} />
              <Text style={[s.label, { marginTop: 2 }]}>Modello 3D</Text>
            </View>
          )}
        </View>

        {/* Configurations */}
        <Text style={s.section}>Configurazioni Consigliate</Text>
        <View style={s.cols3}>
          {oneConfig && <ConfigBlock config={oneConfig} isOne />}
          {plusConfig && <ConfigBlock config={plusConfig} />}
          {proConfig && <ConfigBlock config={proConfig} />}
        </View>

        {/* Mattress layer cross-section diagrams */}
        <Text style={s.section}>Struttura a Strati</Text>
        <View style={s.cols3}>
          {oneConfig && <MattressLayerDiagram config={oneConfig} />}
          {plusConfig && <MattressLayerDiagram config={plusConfig} />}
          {proConfig && <MattressLayerDiagram config={proConfig} />}
        </View>

        {/* Algorithm scores */}
        {proConfig?.algorithm_scores && (
          <View style={[s.card, { marginTop: 10 }]}>
            <Text style={[s.label, { marginBottom: 3 }]}>Punteggi Algoritmo</Text>
            <Text style={{ fontSize: 7, color: colors.gray600 }}>
              Peso→Topper: {proConfig.algorithm_scores.weight_score_topper} | Mod: {proConfig.algorithm_scores.modifier_total_topper} | Finale: {proConfig.algorithm_scores.final_score_topper}
            </Text>
            <Text style={{ fontSize: 7, color: colors.gray600 }}>
              Peso→Base: {proConfig.algorithm_scores.weight_score_base} | Mod: {proConfig.algorithm_scores.modifier_total_base} | Finale: {proConfig.algorithm_scores.final_score_base}
            </Text>
            <Text style={{ fontSize: 7, color: colors.gray600 }}>
              Peso→Lombare: {proConfig.algorithm_scores.weight_score_lumbar} | Mod: {proConfig.algorithm_scores.modifier_total_lumbar} | Finale: {proConfig.algorithm_scores.final_score_lumbar}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Doctorbed — Dispositivo Medico Classe I</Text>
          <Text style={s.footerText}>Documento generato automaticamente</Text>
        </View>
      </Page>
    </Document>
  );
}
