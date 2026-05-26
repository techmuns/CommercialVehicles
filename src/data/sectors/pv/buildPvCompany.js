// Maps the PV data/config layer into the SAME company-object shape the React
// components consume (the shape buildFromActuals produces for 2W). Anything PV
// doesn't disclose is left null/empty — the components already render those as
// "Pending" / "Not disclosed", identical to the 2W companies.

import { FY } from '../../_fy.js'
import {
  PV_META,
  metricSeries, metricRow, industrySeries, industryRow,
  latestInfo, signalFor, vehicleRows, vehicleSeries,
  toneFromSignal, driverTagFromSignal,
  fmtPct, fmtPctSigned, fmtPpSigned, fmtRupees, fmtUnitsL,
} from './pvConfig.js'

const fy25Idx = FY.indexOf('FY25')
const fy24Idx = FY.indexOf('FY24')

const SEG_COLORS = ['#1F2937', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6']

const PV_SOURCE_LINE =
  'Source: NSE / BSE filings · Annual reports · Quarterly results · Investor presentations'

const updatedLabel = () => {
  const iso = PV_META?.last_refresh
  const d = iso ? new Date(iso) : null
  return d && !isNaN(d)
    ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
}

const read = (d) => (typeof d !== 'number' ? 'Neutral' : d > 1 ? 'Positive' : d < -1 ? 'Negative' : 'Neutral')

// Build a Supporting-Data block (FY24 vs FY25 table + read) from a list of
// PV metric names. fmt per column: 'pp' (percent) or 'abs' (plain number).
function buildBlock(company, metricDefs) {
  const columns = metricDefs.map((m) => m.label)
  const fmt = metricDefs.map((m) => m.fmt)
  const fy24 = metricDefs.map((m) => metricSeries(company, m.metric)[fy24Idx])
  const fy25 = metricDefs.map((m) => metricSeries(company, m.metric)[fy25Idx])
  const change = fy25.map((v, i) =>
    typeof fy24[i] === 'number' && typeof v === 'number' ? Number((v - fy24[i]).toFixed(2)) : null,
  )
  const readRow = change.map((c) => (c === null ? 'Neutral' : read(c)))
  return { columns, fy24, fy25, change, read: readRow, fmt }
}

function chartSeries(company, metricDefs) {
  return metricDefs.map((m, i) => ({
    name: m.label,
    color: SEG_COLORS[i % SEG_COLORS.length],
    values: metricSeries(company, m.metric),
  }))
}

// ---- KPI card from a single percent metric --------------------------------
function pctKpi(company, key, label, metric) {
  const series = metricSeries(company, metric)
  const row25 = metricRow(company, metric, 'FY25')
  const delta = typeof row25?.YoY_Change === 'number' ? row25.YoY_Change : null
  return {
    key, label,
    value: fmtPct(series[fy25Idx]),
    sub: 'FY25',
    delta: fmtPpSigned(delta),
    tone: row25?.Signal ? toneFromSignal(row25.Signal) : (delta == null ? 'flat' : read(delta) === 'Positive' ? 'pos' : read(delta) === 'Negative' ? 'neg' : 'flat'),
    fmt: 'pp',
    series,
    source: row25?.Source || null,
  }
}

// ---- Performance mix builders ---------------------------------------------
function buildMixRich(company) {
  const totalSeries = metricSeries(company, 'Total Sales Volume')
  const totalByFy = {}
  FY.forEach((fy, i) => { if (typeof totalSeries[i] === 'number') totalByFy[fy] = totalSeries[i] })

  const mixFys = FY.filter((fy) => {
    const idx = FY.indexOf('FY23')
    return FY.indexOf(fy) >= idx && typeof totalByFy[fy] === 'number'
  })

  // Product mix — top models grouped by body-type segment (residual = Unclassified).
  const productByFy = {}
  const productStatus = {}
  const productSources = {}
  mixFys.forEach((fy) => {
    const rows = vehicleRows(company, fy)
    if (!rows.length) return
    const bySeg = {}
    rows.forEach((r) => {
      if (typeof r.Volume !== 'number') return
      bySeg[r.Segment] = (bySeg[r.Segment] || 0) + r.Volume
    })
    const segs = Object.keys(bySeg)
    if (!segs.length) return
    productByFy[fy] = segs.map((name, i) => ({ name, volume: bySeg[name], color: SEG_COLORS[i % SEG_COLORS.length] }))
    productStatus[fy] = 'available'
    productSources[fy] = 'Model-wise volumes · annual reports / industry data'
  })

  // Powertrain — EV vs ICE, derived from EV Volume % × total volume.
  const evPct = metricSeries(company, 'EV Volume %')
  const powertrainByFy = {}
  const powertrainStatus = {}
  const powertrainSources = {}
  mixFys.forEach((fy) => {
    const i = FY.indexOf(fy)
    const total = totalByFy[fy]
    const ev = evPct[i]
    if (typeof total !== 'number' || typeof ev !== 'number') return
    powertrainByFy[fy] = [
      { name: 'ICE', volume: Math.round(total * (1 - ev / 100)), color: '#1F2937' },
      { name: 'EV',  volume: Math.round(total * (ev / 100)),     color: '#10B981' },
    ]
    powertrainStatus[fy] = 'derived'
    powertrainSources[fy] = 'Derived: EV volume % × total volume'
  })

  // Geography — Domestic vs Export, derived from Export Volume % × total volume.
  const expPct = metricSeries(company, 'Export Volume %')
  const geographyByFy = {}
  const geographyStatus = {}
  const geographySources = {}
  mixFys.forEach((fy) => {
    const i = FY.indexOf(fy)
    const total = totalByFy[fy]
    const exp = expPct[i]
    if (typeof total !== 'number' || typeof exp !== 'number') return
    geographyByFy[fy] = [
      { name: 'Domestic', volume: Math.round(total * (1 - exp / 100)), color: '#3B82F6' },
      { name: 'Export',   volume: Math.round(total * (exp / 100)),     color: '#F59E0B' },
    ]
    geographyStatus[fy] = 'derived'
    geographySources[fy] = 'Derived: export volume % × total volume'
  })

  return {
    totalByFy,
    productByFy, powertrainByFy, geographyByFy,
    dataStatus: {
      productMix: productStatus,
      powertrainMix: powertrainStatus,
      domesticExportMix: geographyStatus,
      statusLegend: {
        available: 'Disclosed model-wise volumes.',
        derived: 'Computed from disclosed mix % and total volume.',
        unavailable: 'Not disclosed for this FY.',
      },
    },
    sourcesByFy: {
      productMix: productSources,
      ev: powertrainSources,
      exports: geographySources,
    },
  }
}

// ---- Product drivers (vehicle cards) --------------------------------------
function buildDrivers(company) {
  const latest = vehicleRows(company, 'FY25')
  const totalFy25 = metricSeries(company, 'Total Sales Volume')[fy25Idx]
  return latest
    .slice()
    .sort((a, b) => (b.Volume || 0) - (a.Volume || 0))
    .slice(0, 6)
    .map((r) => {
      const seriesMap = vehicleSeries(company, r.Vehicle)
      const series = ['FY23', 'FY24', 'FY25']
        .map((fy) => ({ fy, value: typeof seriesMap[fy] === 'number' ? seriesMap[fy] : null }))
      const yoy = typeof r.YoY_Growth === 'number' ? r.YoY_Growth : null
      return {
        key: r.Vehicle,
        name: r.Vehicle,
        category: r.Segment,
        segment: r.Segment,
        tag: driverTagFromSignal(r.Signal),
        signal: driverTagFromSignal(r.Signal),
        value: fmtUnitsL(r.Volume),
        sub: 'FY25 volume',
        growth: fmtPctSigned(yoy),
        yoyPct: yoy,
        fy25Raw: typeof r.Volume === 'number' ? r.Volume : null,
        mixOfTotal2WPct: typeof r.Volume === 'number' && typeof totalFy25 === 'number' && totalFy25 > 0
          ? Number(((r.Volume / totalFy25) * 100).toFixed(1)) : null,
        series,
        source: 'Annual reports · industry model-wise sales',
      }
    })
}

// ===========================================================================
// OEM builder
// ===========================================================================
export function buildPvCompany(spec) {
  const { id, company, name, shortName, brandText, brandColor, dotColor } = spec

  const kpis = [
    pctKpi(company, 'mktShare', 'Market Share %', 'Market Share %'),
    pctKpi(company, 'volGrowth', 'Volume Growth %', 'Volume Growth %'),
    pctKpi(company, 'revGrowth', 'Revenue Growth %', 'Revenue Growth %'),
    pctKpi(company, 'ebitda', 'EBITDA Margin %', 'EBITDA Margin %'),
    pctKpi(company, 'premium', 'SUV Volume %', 'SUV Volume %'),
    (() => {
      const series = metricSeries(company, 'Stock Price (31-Mar)')
      const row25 = metricRow(company, 'Stock Price (31-Mar)', 'FY25')
      const delta = typeof row25?.YoY_Change === 'number' ? row25.YoY_Change : null
      return {
        key: 'stock', label: 'Stock Price (31-Mar)',
        value: fmtRupees(series[fy25Idx]),
        sub: 'FY25 close',
        delta: fmtPctSigned(delta),
        tone: row25?.Signal ? toneFromSignal(row25.Signal) : 'flat',
        fmt: 'abs',
        series,
        source: row25?.Source || null,
      }
    })(),
  ]

  const sig = signalFor(company, 'FY25')
  const info = latestInfo(company)

  const growthBlocks = [
    { metric: 'Revenue Growth %', label: 'Revenue Growth %', fmt: 'pp' },
    { metric: 'Volume Growth %', label: 'Volume Growth %', fmt: 'pp' },
    { metric: 'Realisation Growth %', label: 'Realisation Growth %', fmt: 'pp' },
  ]
  const marginBlocks = [
    { metric: 'Gross Margin %', label: 'Gross Margin %', fmt: 'pp' },
    { metric: 'EBITDA Margin %', label: 'EBITDA Margin %', fmt: 'pp' },
  ]
  const mixBlocks = [
    { metric: 'SUV Volume %', label: 'SUV Volume %', fmt: 'pp' },
    { metric: 'EV Volume %', label: 'EV Volume %', fmt: 'pp' },
    { metric: 'Export Volume %', label: 'Export Volume %', fmt: 'pp' },
  ]
  const opsBlocks = [
    { metric: 'Capacity Utilisation %', label: 'Capacity Utilisation %', fmt: 'pp' },
    { metric: 'Capex (Rs Cr)', label: 'Capex (₹ Cr)', fmt: 'abs' },
    { metric: 'Working Capital Days', label: 'Working Capital Days', fmt: 'abs' },
  ]

  const supportingData = {
    Growth: buildBlock(company, growthBlocks),
    Margins: buildBlock(company, marginBlocks),
    Mix: buildBlock(company, mixBlocks),
    Operations: buildBlock(company, opsBlocks),
  }
  const charts = {
    Growth: chartSeries(company, growthBlocks),
    Margins: chartSeries(company, marginBlocks),
    Mix: chartSeries(company, mixBlocks),
    Operations: chartSeries(company, opsBlocks),
  }

  return {
    id, name, shortName, brandText, brandColor, dotColor,
    signal: sig?.Overall_Signal || 'Neutral',
    updated: updatedLabel(),
    dataFresh: 'Audited',
    hero: { title: name, subtitle: 'Buy-side snapshot · FY16–FY25', fy: 'FY25' },
    kpis,
    performance: {
      growth: {
        oem: metricSeries(company, 'Volume Growth %'),
        industry: industrySeries('PV Volume Growth %'),
      },
      mixRich: buildMixRich(company),
    },
    productDrivers: buildDrivers(company),
    supportingData,
    supportBlocks: ['Growth', 'Margins', 'Mix', 'Operations'],
    charts,
    industryLabel: 'PV industry',
    modelSource: PV_SOURCE_LINE,
    logo: null,
    profile: info ? {
      asOfFy: info.FY,
      kmp: { ceo: clean(info.CEO), cfo: clean(info.CFO), coo: clean(info.COO) },
      creditRating: { longTerm: clean(info.Credit_Rating) },
      dealers: { total: info.Dealers },
      employees: { permanent: info.Employees },
      source: info.Source && info.Source !== 'Pending' ? info.Source : null,
    } : null,
    // Buy-side reads from the signal row, surfaced in the header signal + tooltip.
    buyside: sig ? {
      share: sig.Share_Read, growth: sig.Growth_Read, margin: sig.Margin_Read,
      mix: sig.Mix_Read, risk: sig.Risk_Read, trigger: sig.Trigger_Read,
      overall: sig.Overall_Signal,
    } : null,
  }
}

const clean = (v) => (v && v !== '—' && v !== 'Pending' ? v : null)

// ===========================================================================
// PV Industry aggregate
// ===========================================================================
export function buildPvIndustry(spec) {
  const { id, name, shortName, brandText, brandColor, dotColor } = spec

  const indKpi = (key, label, metric, fmt) => {
    const series = industrySeries(metric)
    const row25 = industryRow(metric, 'FY25')
    const delta = typeof row25?.YoY_Change === 'number' ? row25.YoY_Change : null
    let value
    if (fmt === 'units') value = fmtUnitsL(series[fy25Idx])
    else if (fmt === 'pp') value = fmtPct(series[fy25Idx])
    else value = row25?.Value != null ? String(row25.Value) : null
    return {
      key, label, value,
      sub: 'FY25',
      delta: fmt === 'pp' || fmt === 'units' ? fmtPpSigned(delta) : null,
      tone: row25?.Signal ? toneFromSignal(row25.Signal) : (delta == null ? 'flat' : read(delta) === 'Positive' ? 'pos' : read(delta) === 'Negative' ? 'neg' : 'flat'),
      fmt: fmt === 'pp' ? 'pp' : 'abs',
      series: fmt === 'text' ? [] : series,
      source: row25?.Source || null,
    }
  }

  const kpis = [
    indKpi('volGrowth', 'Total PV Volume', 'Total PV Volume', 'units'),
    indKpi('revGrowth', 'PV Volume Growth %', 'PV Volume Growth %', 'pp'),
    indKpi('premium', 'SUV Share %', 'SUV Share %', 'pp'),
    indKpi('evMix', 'EV Share %', 'EV Share %', 'pp'),
    indKpi('exportMix', 'Export Share %', 'Export Share %', 'pp'),
    indKpi('mktShare', 'Top Gaining OEM', 'Top Gaining OEM', 'text'),
  ]

  const demandBlocks = [
    { metric: 'Total PV Volume', label: 'Total PV Volume', fmt: 'abs' },
    { metric: 'PV Volume Growth %', label: 'PV Volume Growth %', fmt: 'pp' },
  ]
  const mixBlocks = [
    { metric: 'SUV Share %', label: 'SUV Share %', fmt: 'pp' },
    { metric: 'EV Share %', label: 'EV Share %', fmt: 'pp' },
    { metric: 'Export Share %', label: 'Export Share %', fmt: 'pp' },
  ]
  const indBlock = (defs) => {
    const columns = defs.map((m) => m.label)
    const fmt = defs.map((m) => m.fmt)
    const fy24 = defs.map((m) => industrySeries(m.metric)[fy24Idx])
    const fy25 = defs.map((m) => industrySeries(m.metric)[fy25Idx])
    const change = fy25.map((v, i) => (typeof fy24[i] === 'number' && typeof v === 'number' ? Number((v - fy24[i]).toFixed(2)) : null))
    return { columns, fy24, fy25, change, read: change.map((c) => (c === null ? 'Neutral' : read(c))), fmt }
  }
  const indChart = (defs) => defs.map((m, i) => ({ name: m.label, color: SEG_COLORS[i % SEG_COLORS.length], values: industrySeries(m.metric) }))

  return {
    id, name, shortName, brandText, brandColor, dotColor,
    signal: 'Neutral',
    updated: updatedLabel(),
    dataFresh: 'Audited',
    hero: { title: name, subtitle: 'Passenger-vehicle industry aggregate · FY16–FY25', fy: 'FY25' },
    kpis,
    performance: {
      growth: { oem: industrySeries('PV Volume Growth %'), industry: [] },
      mixRich: { totalByFy: {}, productByFy: {}, powertrainByFy: {}, geographyByFy: {}, dataStatus: {}, sourcesByFy: {} },
    },
    productDrivers: [],
    supportingData: { Demand: indBlock(demandBlocks), Mix: indBlock(mixBlocks) },
    supportBlocks: ['Demand', 'Mix'],
    charts: { Demand: indChart(demandBlocks), Mix: indChart(mixBlocks) },
    industryLabel: 'PV industry',
    modelSource: 'Source: SIAM · Vahan · FADA · industry estimates',
    logo: null,
    profile: null,
    buyside: null,
  }
}
