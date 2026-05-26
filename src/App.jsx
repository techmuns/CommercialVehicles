import React, { useMemo, useState } from 'react'
import { SECTORS, DEFAULT_SECTOR_ID, FY } from './data.js'
import { exportCompanyCsv } from './export.js'
import Header from './components/Header.jsx'
import HeroCard from './components/HeroCard.jsx'
import DataQualityPanel from './components/DataQualityPanel.jsx'
import KpiCards from './components/KpiCards.jsx'
import PerformanceSection from './components/PerformanceSection.jsx'
import ProductDrivers from './components/ProductDrivers.jsx'
import ProductDriverModal from './components/ProductDriverModal.jsx'
import SupportingData from './components/SupportingData.jsx'
import GovernanceNetwork from './components/GovernanceNetwork.jsx'
import SourcesPanel from './components/SourcesPanel.jsx'
import KpiModal from './components/KpiModal.jsx'
import Footer from './components/Footer.jsx'

const sectorById = (id) => SECTORS.find((s) => s.id === id) || SECTORS[0]

export default function App() {
  const [activeSectorId, setActiveSectorId] = useState(DEFAULT_SECTOR_ID)
  const sector = useMemo(() => sectorById(activeSectorId), [activeSectorId])

  const [activeId, setActiveId] = useState(sector.meta.defaultCompanyId || sector.companies[0]?.id)
  const [modalKpi, setModalKpi] = useState(null)
  const [modalDriver, setModalDriver] = useState(null)

  const company = useMemo(
    () => sector.companies.find((c) => c.id === activeId) || sector.companies[0],
    [sector, activeId],
  )

  const onSelectSector = (id) => {
    const next = sectorById(id)
    setActiveSectorId(id)
    setActiveId(next.meta.defaultCompanyId || next.companies[0]?.id)
    setModalKpi(null)
    setModalDriver(null)
  }

  return (
    <div className="min-h-full relative">
      <div className="watermark" aria-hidden="true" />
      <Header
        company={company}
        companies={sector.companies}
        sectors={SECTORS}
        activeSectorId={activeSectorId}
        meta={sector.meta}
        onSelectSector={onSelectSector}
        onSelectCompany={setActiveId}
        onExport={() => exportCompanyCsv(company, FY)}
      />
      <main className="max-w-[1400px] mx-auto px-6 py-7 space-y-7 relative">
        <HeroCard company={company} />
        <DataQualityPanel company={company} />
        <KpiCards kpis={company.kpis} onKpiClick={setModalKpi} />
        <PerformanceSection company={company} />
        <ProductDrivers drivers={company.productDrivers} onCardClick={setModalDriver} />
        <SupportingData company={company} />
        <GovernanceNetwork company={company} />
        <SourcesPanel company={company} />
        <Footer meta={sector.meta} />
      </main>
      <KpiModal open={!!modalKpi} kpi={modalKpi} company={company} onClose={() => setModalKpi(null)} />
      <ProductDriverModal
        open={!!modalDriver}
        driver={modalDriver}
        allDrivers={company.productDrivers}
        company={company}
        onClose={() => setModalDriver(null)}
      />
    </div>
  )
}
