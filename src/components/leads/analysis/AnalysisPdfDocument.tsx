import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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
const SLEEP_LABELS: Record<string, string> = { side: 'Laterale', supine: 'Supino', prone: 'Prono', mixed: 'Misto' };
const FIRMNESS_LABELS: Record<string, string> = { soft: 'Accogliente', neutral: 'Neutro', firm: 'Sostenuto' };
const HEALTH_LABELS: Record<string, string> = { lower_back_pain: 'Dolore lombare', shoulder_pain: 'Dolore spalle', hip_pain: 'Dolore anche', sciatica: 'Sciatica', lordosis: 'Lordosi', kyphosis: 'Cifosi', fibromyalgia: 'Fibromialgia' };
const BASE_LABELS: Record<string, string> = { soft: 'Soft', medium: 'Medium', hard: 'Hard' };
const TOPPER_LABELS: Record<number, string> = { 1: 'L1 — Ultra morbido', 2: 'L2 — Morbido', 3: 'L3 — Medio', 4: 'L4 — Sostenuto', 5: 'L5 — Rigido', 6: 'L6 — Ultra rigido' };
const CYL_LABELS: Record<string, string> = { none: 'Nessuno', super_soft_6: 'Super Soft 6cm', soft_8: 'Soft 8cm', medium_8: 'Medium 8cm', firm_8: 'Firm 8cm' };

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
}

export function AnalysisPdfDocument({ analysis, leadName }: Props) {
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
            <Text style={s.brand}>doctorbed</Text>
            <Text style={s.date}>Scheda Analisi Personalizzata</Text>
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

        <View style={s.card}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View style={{ flex: 1 }}>
              <InfoRow label="Sesso" value={analysis.sex === 'male' ? 'Uomo' : 'Donna'} />
              <InfoRow label="Peso" value={`${analysis.weight_kg} kg`} />
              <InfoRow label="Altezza" value={`${analysis.height_cm} cm`} />
              <InfoRow label="Forma corpo" value={BODY_LABELS[analysis.body_shape || 'normal']} />
            </View>
            <View style={{ flex: 1 }}>
              <InfoRow label="Posizione sonno" value={SLEEP_LABELS[analysis.sleep_position || 'mixed']} />
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

        {/* Configurations */}
        <Text style={s.section}>Configurazioni Consigliate</Text>
        <View style={s.cols3}>
          {oneConfig && <ConfigBlock config={oneConfig} isOne />}
          {plusConfig && <ConfigBlock config={plusConfig} />}
          {proConfig && <ConfigBlock config={proConfig} />}
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
