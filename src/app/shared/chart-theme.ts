import { ApexDataLabels } from 'ng-apexcharts';

/**
 * Site-wide chart palette — anchored on the navy primary (#1b2b4a) and the
 * indigo/green/blue/amber accents already used by the KPI tiles and the
 * home-page action cards. Use these constants for every chart so the
 * dashboard reads as one designed system instead of a patchwork.
 */

/** Brand-anchored palette (matches the KPI tile and action-card colors). */
export const CHART_PALETTE = [
  '#6366f1', // indigo  (KPI primary)
  '#22c55e', // emerald (success)
  '#0ea5e9', // sky     (info)
  '#f59e0b', // amber   (warning)
  '#ec4899', // pink
  '#8b5cf6', // violet  (purple group)
  '#14b8a6', // teal
  '#ef4444', // red     (danger)
];

/** Same palette in a longer ramp — useful for distributed bar charts. */
export const BAR_DISTRIBUTED_COLORS = [
  '#6366f1', '#22c55e', '#0ea5e9', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444',
  '#3b82f6', '#84cc16',
];

/**
 * Navy-tone palette derived from the site's primary (#1b2b4a). Used by donut
 * charts so all slices share a coherent brand tone — light data labels read
 * white on top of them (see DONUT_DATA_LABELS below).
 */
export const DONUT_COLORS = ['#1b2b4a', '#3b5683', '#6b7a99', '#a3afc7'];

/**
 * Light-colored donut percentage labels — readable on the dark navy slices.
 * ApexCharts applies `style.colors` per slice; with a single-entry array the
 * remaining slices fall back to its auto-contrast routine (often olive/dark
 * for dark themes). We pad the array so up to 16 slices all get white.
 */
export const DONUT_DATA_LABELS: ApexDataLabels = {
  enabled: true,
  style: {
    colors:    Array(16).fill('#ffffff'),
    fontSize:  '13px',
    fontWeight: 600,
  },
  dropShadow: { enabled: false },
};

/** Semantic colors — use when a chart conveys directional meaning. */
export const SEMANTIC = {
  positive: '#22c55e',   // emerald — green = growth, income
  negative: '#ef4444',   // red    — expenses, losses
  neutral:  '#6366f1',   // indigo — generic
  highlight: '#f59e0b',  // amber  — drawing attention without alarm
};
