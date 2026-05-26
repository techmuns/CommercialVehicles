// Build-time access layer over the existing PV data/config JSON files.
//
// These are the SAME files the GitHub Action (refresh-data.yml) writes to —
// we import them directly so a data refresh + rebuild flows straight through,
// and refresh-data.yml never has to change. Nothing here mutates the source.

import placeholder    from '../../../../data/config/placeholder_data.json'
import companyConfig  from '../../../../data/config/company_config.json'
import vehicleConfig  from '../../../../data/config/vehicle_config.json'
import { FY } from '../../_fy.js'

export const PV_COMPANY_METRICS  = placeholder.company_fy_metrics  || []
export const PV_VEHICLE_METRICS  = placeholder.vehicle_fy_metrics  || []
export const PV_BUYSIDE_SIGNALS  = placeholder.buyside_signals     || []
export const PV_COMPANY_INFO     = placeholder.company_info        || []
export const PV_INDUSTRY_METRICS = placeholder.industry_fy_metrics || []
export const PV_META             = placeholder._meta || null

export const PV_BRANDS = companyConfig.brands || {}
export const PV_DEFAULT_VEHICLES = vehicleConfig.default_vehicles || {}

// ---- generic helpers ----------------------------------------------------

// A series aligned to the dashboard FY axis (FY16..FY27). Pulls one metric's
// value per FY for a given company from company_fy_metrics. Missing FYs → null.
export function metricSeries(company, metric) {
  const byFy = {}
  for (const r of PV_COMPANY_METRICS) {
    if (r.Company === company && r.Metric === metric && typeof r.Value === 'number') {
      byFy[r.FY] = r.Value
    }
  }
  return FY.map((fy) => (typeof byFy[fy] === 'number' ? byFy[fy] : null))
}

// The single row for (company, metric, FY) — carries Value, YoY_Change, Signal, Source.
export function metricRow(company, metric, fy) {
  return PV_COMPANY_METRICS.find(
    (r) => r.Company === company && r.Metric === metric && r.FY === fy,
  ) || null
}

export function industrySeries(metric) {
  const byFy = {}
  for (const r of PV_INDUSTRY_METRICS) {
    if (r.Metric === metric && typeof r.Value === 'number') byFy[r.FY] = r.Value
  }
  return FY.map((fy) => (typeof byFy[fy] === 'number' ? byFy[fy] : null))
}

export function industryRow(metric, fy) {
  return PV_INDUSTRY_METRICS.find((r) => r.Metric === metric && r.FY === fy) || null
}

// Latest company_info row for a company (prefers FY25, else most recent).
export function latestInfo(company) {
  const rows = PV_COMPANY_INFO.filter((r) => r.Company === company)
  if (!rows.length) return null
  return rows.find((r) => r.FY === 'FY25') ||
         rows.slice().sort((a, b) => (a.FY < b.FY ? 1 : -1))[0]
}

export function signalFor(company, fy) {
  return PV_BUYSIDE_SIGNALS.find((r) => r.Company === company && r.FY === fy) || null
}

// Vehicle rows for a company at a given FY.
export function vehicleRows(company, fy) {
  return PV_VEHICLE_METRICS.filter((r) => r.Company === company && r.FY === fy)
}

export function vehicleSeries(company, vehicle) {
  const byFy = {}
  for (const r of PV_VEHICLE_METRICS) {
    if (r.Company === company && r.Vehicle === vehicle && typeof r.Volume === 'number') {
      byFy[r.FY] = r.Volume
    }
  }
  return byFy
}

// Map a PV "Signal" string to the dashboard tone vocabulary.
export const toneFromSignal = (s) =>
  s === 'Positive' ? 'pos' : s === 'Negative' ? 'neg' : 'flat'

export const driverTagFromSignal = (s) =>
  s === 'Positive' ? 'Gain' : s === 'Negative' ? 'Loss' : 'Stable'

// Formatters (mirror buildFromActuals so the UI reads identically).
export const fmtPct       = (v) => (typeof v === 'number' ? `${v.toFixed(1)}%` : null)
export const fmtPctSigned = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : null)
export const fmtPpSigned  = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp` : null)
export const fmtRupees    = (v) => (typeof v === 'number' ? `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : null)
export const fmtUnitsL    = (n) => (typeof n === 'number' ? `${(n / 100000).toFixed(2)} L` : null)
