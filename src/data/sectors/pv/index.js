import { buildPvCompany, buildPvIndustry } from './buildPvCompany.js'
import { PV_BRANDS } from './pvConfig.js'

const color = (k, fallback) => PV_BRANDS[k]?.color || fallback

const pvIndustry = buildPvIndustry({
  id: 'pv-industry', name: 'PV Industry', shortName: 'Industry',
  brandText: 'PV', brandColor: color('Industry', '#334E68'), dotColor: color('Industry', '#334E68'),
})

const maruti = buildPvCompany({
  id: 'maruti', company: 'Maruti', name: 'Maruti Suzuki', shortName: 'Maruti',
  brandText: 'MARUTI', brandColor: color('Maruti', '#C95A5A'), dotColor: color('Maruti', '#C95A5A'),
})

const hyundai = buildPvCompany({
  id: 'hyundai', company: 'Hyundai', name: 'Hyundai Motor India', shortName: 'Hyundai',
  brandText: 'HYUNDAI', brandColor: color('Hyundai', '#0F3D75'), dotColor: color('Hyundai', '#0F3D75'),
})

const mm = buildPvCompany({
  id: 'mm', company: 'M&M', name: 'Mahindra & Mahindra', shortName: 'M&M',
  brandText: 'MAHINDRA', brandColor: color('M&M', '#7A2E3A'), dotColor: color('M&M', '#7A2E3A'),
})

const tata = buildPvCompany({
  id: 'tata', company: 'Tata Motors PV', name: 'Tata Motors (PV)', shortName: 'Tata PV',
  brandText: 'TATA', brandColor: color('Tata Motors PV', '#1E4E8C'), dotColor: color('Tata Motors PV', '#1E4E8C'),
})

export const PV_SECTOR = {
  id: 'pv',
  meta: {
    id: 'pv',
    title: 'PV Industry Dashboard',
    subtitle: 'Passenger vehicles · buy-side view',
    badge: 'PV',
    latestFy: 'FY25',
    footer: 'Source: NSE / BSE filings · Annual reports · Quarterly results · Investor presentations',
    defaultCompanyId: 'maruti',
  },
  companies: [pvIndustry, maruti, hyundai, mm, tata],
}
