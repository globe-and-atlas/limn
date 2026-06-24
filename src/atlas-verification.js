export const ATLAS_VERIFICATION = {
  'BH-DFSI': {
    tier: 'Strong',
    basis: 'The Montecito debris-flow corridor is documented by USGS data, USGS field reporting, and California emergency-management imagery after the Thomas Fire.',
    sources: [
      { type: 'Dataset', label: 'USGS Montecito debris-flow inundation and damage data', url: 'https://www.usgs.gov/data/debris-flow-inundation-and-damage-data-9-january-2018-montecito-debris-flow-event' },
      { type: 'Event', label: 'USGS Montecito debris-flow aftermath field report', url: 'https://www.usgs.gov/news/featured-story/usgs-geologists-join-efforts-montecito-assess-debris-flow-aftermath' },
      { type: 'Context', label: 'USGS disaster-recovery assessment of Montecito debris-flow impacts', url: 'https://www.usgs.gov/supplemental-appropriations-for-disaster-recovery-activities/assessment-landslide-and-debris-flow-0' },
    ],
  },
  'SF-EII': {
    tier: 'Strong',
    basis: 'California 2021 drought and fire-season stress are documented by Drought.gov, NASA, and the US Drought Monitor; Sentinel-2 canopy-water-stress method remains supporting reference.',
    sources: [
      { type: 'Event', label: 'US Drought Monitor California drought archive', url: 'https://droughtmonitor.unl.edu/CurrentMap/StateDroughtMonitor.aspx?CA' },
      { type: 'Event', label: 'Drought.gov California-Nevada October 2021 drought update', url: 'https://www.drought.gov/drought-status-updates/drought-status-update-california-nevada-2021-10-15' },
      { type: 'Context', label: 'NASA SVS drought conditions set stage for intense 2021 fire season', url: 'https://svs.gsfc.nasa.gov/5051' },
      { type: 'Method', label: 'Live fuel moisture remote-sensing review', url: 'https://doi.org/10.1016/j.rse.2018.06.024' },
    ],
  },
  LFMPI: {
    tier: 'Strong',
    basis: 'California 2021 drought and vegetation stress sources confirm the bookmark event context; live-fuel-moisture method remains supporting reference.',
    sources: [
      { type: 'Method', label: 'Yebra et al. live fuel moisture content estimation', url: 'https://doi.org/10.1016/j.rse.2018.06.024' },
      { type: 'Event', label: 'US Drought Monitor California drought archive', url: 'https://droughtmonitor.unl.edu/CurrentMap/StateDroughtMonitor.aspx?CA' },
      { type: 'Event', label: 'Drought.gov California-Nevada October 2021 drought update', url: 'https://www.drought.gov/drought-status-updates/drought-status-update-california-nevada-2021-10-15' },
      { type: 'Context', label: 'NASA SVS drought conditions set stage for intense 2021 fire season', url: 'https://svs.gsfc.nasa.gov/5051' },
    ],
  },
  SACI: {
    tier: 'Strong',
    basis: 'Bootleg/Dixie fire smoke was independently observed in August 2021 by NOAA and NASA, with California fire incident records supporting the fire-season setting.',
    sources: [
      { type: 'Event', label: 'NOAA GML long-range smoke from Bootleg and Dixie fires', url: 'https://gml.noaa.gov/aero/net/bld/2021_fires.html' },
      { type: 'Event', label: 'NASA Earth Observatory Dixie Fire smoke plume', url: 'https://science.nasa.gov/earth/earth-observatory/californias-dixie-fire-keeps-on-growing-148669/' },
      { type: 'Event', label: 'NASA Earth Observatory arc of fires in the U.S. West', url: 'https://science.nasa.gov/earth/earth-observatory/arc-of-fires-in-the-us-west-148772/' },
      { type: 'Method', label: 'UV Aerosol Index smoke-plume mapping reference', url: 'https://www.frontiersin.org/journals/remote-sensing/articles/10.3389/frsen.2021.766628/full' },
    ],
  },
  PETI: {
    tier: 'Strong',
    basis: 'The western Lake Erie HAB bookmark is supported by NOAA seasonal analysis, NOAA forecast context, and NASA Earth Observatory bloom imagery.',
    sources: [
      { type: 'Event', label: 'NOAA NCCOS Lake Erie HAB 2019 retrospective', url: 'https://coastalscience.noaa.gov/news/lake-erie-hab-2019-retrospective-bloom-severity-was-7-3-as-predicted-by-the-seasonal-forecast/' },
      { type: 'Event', label: 'NASA Earth Observatory: Eerie Blooms in Lake Erie', url: 'https://science.nasa.gov/earth/earth-observatory/eerie-blooms-in-lake-erie-145453/' },
      { type: 'Context', label: 'EPA/ECCC Lake Erie status and progress report', url: 'https://www.epa.gov/glwqa/status-and-progress' },
    ],
  },
  CSRC: {
    tier: 'Strong',
    basis: 'Lake Taihu cyanobacterial bloom monitoring is documented by NASA and a lake-specific time-series dataset.',
    sources: [
      { type: 'Event', label: 'NASA Earthdata Lake Taihu water-quality monitoring', url: 'https://www.earthdata.nasa.gov/news/feature-articles/cleaner-water-from-space' },
      { type: 'Dataset', label: 'Lake Taihu cyanobacterial bloom time-series dataset', url: 'https://www.nature.com/articles/s41597-024-04224-w' },
      { type: 'Dataset', label: 'PMC mirror of Lake Taihu cyanobacterial bloom dataset', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11655629/' },
    ],
  },
  RRFI: {
    tier: 'Strong',
    basis: 'Upper Rio Grande drought and streamflow response are documented by USGS and drought-monitoring sources; the bookmark is a riparian corridor stress demonstration.',
    sources: [
      { type: 'Event', label: 'Drought.gov Rio Grande watershed conditions', url: 'https://www.drought.gov/watersheds/rio-grande' },
      { type: 'Context', label: 'Drought.gov USGS WaterWatch streamflow data tool', url: 'https://www.drought.gov/data-maps-tools/usgs-waterwatch' },
      { type: 'Context', label: 'NOAA Albuquerque 2021 New Mexico hydrology and drought review', url: 'https://www.weather.gov/abq/climonhigh2021annual-hydrodrought' },
      { type: 'Context', label: 'Bureau of Reclamation 2021 SECURE Water Rio Grande basin report', url: 'https://www.usbr.gov/climate/secure/2021secure.html' },
    ],
  },
  EPDI: {
    tier: 'Strong',
    basis: 'The bookmark targets the 2023 Pajaro River levee-breach floodplain, documented by California DWR, USACE repair records, and AP reporting.',
    sources: [
      { type: 'Event', label: 'California DWR Pajaro River levee break response', url: 'https://water.ca.gov/News/Blog/2023/Mar-23/DWR-Supports-Flood-Fight-Efforts-at-Pajaro-River-Levee-Break' },
      { type: 'Event', label: 'Pajaro Regional Flood Management Agency risk-management record', url: 'https://www.prfma.org/risk-management' },
      { type: 'Event', label: 'Associated Press Pajaro levee breach report', url: 'https://apnews.com/article/2677c9eeb138f2a672a2596ef4b1563e' },
    ],
  },
  FCLI: {
    tier: 'Strong',
    basis: 'Houston/Addicks flood context is documented by EPA, USGS, and sediment studies; the bookmark represents persistent post-flood legacy stress.',
    sources: [
      { type: 'Event', label: 'EPA Hurricane Harvey water-system status update', url: 'https://www.epa.gov/archive/epa/newsreleases/status-water-systems-areas-affected-harvey.html' },
      { type: 'Event', label: 'USGS Hurricane Harvey flooding at Addicks Reservoir', url: 'https://www.usgs.gov/media/before-after/hurricane-harvey-flooding-addicks-reservoir-houston-tx' },
      { type: 'Context', label: 'University of Houston Harvey sediment movement report', url: 'https://www.uh.edu/news-events/stories/2023/august-2023/08242023-sediment-movement-during-hurricane-harvey-could-negatively-impact-future-flood.php' },
    ],
  },
  SMPDI: {
    tier: 'Strong',
    basis: 'Caribbean Sargassum bloom mapping is supported by operational satellite bulletins, NOAA tracking context, and the published Sargassum detection method.',
    sources: [
      { type: 'Event', label: 'USF Sargassum Watch System Caribbean bulletins', url: 'https://optics.marine.usf.edu/projects/saws.html' },
      { type: 'Event', label: 'USF Sargassum Outlook July 2021 bulletin', url: 'https://optics.marine.usf.edu/projects/SaWS/pdf/Sargassum_outlook_2021_bulletin07_USF.pdf' },
      { type: 'Context', label: 'NOAA AOML tracking Sargassum inundation potential', url: 'https://www.aoml.noaa.gov/tracking-sargassum/' },
      { type: 'Method', label: 'Wang and Hu Sargassum detection from space', url: 'https://doi.org/10.1016/j.rse.2016.09.008' },
    ],
  },
  CBSDI: {
    tier: 'Strong',
    basis: 'The 2020 Great Barrier Reef bleaching event is confirmed by reef authorities, NOAA coral bleaching monitoring, and independent reporting.',
    sources: [
      { type: 'Event', label: 'Great Barrier Reef Foundation bleaching event record', url: 'https://www.barrierreef.org/the-reef/threats/coral-bleaching' },
      { type: 'Context', label: 'NOAA Coral Reef Watch monitoring program', url: 'https://coralreefwatch.noaa.gov/' },
    ],
  },
  KCDSI: {
    tier: 'Strong',
    basis: 'Monterey Bay kelp monitoring sources match the bookmark place and canopy target.',
    sources: [
      { type: 'Event', label: 'Monterey Bay National Marine Sanctuary kelp forest monitoring', url: 'https://montereybay.noaa.gov/resourcepro/resmanissues/kelp.html' },
      { type: 'Context', label: 'NOAA Monterey Bay sanctuary characterization', url: 'https://montereybay.noaa.gov/science/characterization/' },
      { type: 'Context', label: 'SIMoN Monterey Bay kelp forest profile', url: 'https://sanctuarysimon.org/monterey-bay-nms/kelp-forest/' },
      { type: 'Method', label: 'Satellite mapping of kelp canopy dynamics', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2021.713907/full' },
    ],
  },
  OWSI: {
    tier: 'Strong',
    basis: 'Deepwater Horizon oil-spill context is documented by NOAA, NASA visualization, Smithsonian synthesis, and marine mammal impact records.',
    sources: [
      { type: 'Event', label: 'NOAA Deepwater Horizon oil spill case study', url: 'https://response.restoration.noaa.gov/deepwater-horizon-oil-spill-case-study' },
      { type: 'Event', label: 'NASA SVS Three Months of Oil', url: 'https://svs.gsfc.nasa.gov/10617/' },
      { type: 'Context', label: 'Marine Mammal Commission Deepwater Horizon impacts', url: 'https://www.mmc.gov/priority-topics/offshore-energy-development-and-marine-mammals/gulf-of-mexico-deepwater-horizon-oil-spill-and-marine-mammals/' },
    ],
  },
  'CD-UAI': {
    tier: 'Strong',
    basis: 'Pearl River Estuary sediment dynamics are directly documented by estuary-change and suspended-sediment remote-sensing studies.',
    sources: [
      { type: 'Event', label: 'Scientific Reports Pearl River Estuary sediment dynamics', url: 'https://www.nature.com/articles/s41598-021-96183-0' },
      { type: 'Context', label: 'PMC mirror of Pearl River Estuary morphology study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8371162/' },
      { type: 'Context', label: 'Frontiers Pearl River sediment-load variability study', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2022.983517/full' },
      { type: 'Context', label: 'EGU Pearl River sediment concentration remote-sensing abstract', url: 'https://meetingorganizer.copernicus.org/EGU21/EGU21-331.html' },
      { type: 'Method', label: 'Remote sensing of estuarine suspended sediment', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2021.713907/full' },
    ],
  },
  'MP-PDI': {
    tier: 'Strong',
    basis: 'UNEP, WHOI, CEDRE, chemistry-news, and AP sources support the X-Press Pearl plastic-pellet event now used as the bookmark.',
    sources: [
      { type: 'Event', label: 'UNEP X-Press Pearl maritime disaster report', url: 'https://www.unep.org/resources/report/x-press-pearl-maritime-disaster-sri-lanka-report-un-environmental-advisory-mission' },
      { type: 'Method', label: 'Peer-reviewed X-Press Pearl plastic pellet impact study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10114858/' },
      { type: 'Event', label: 'WHOI X-Press Pearl spill fact sheet', url: 'https://www.whoi.edu/wp-content/uploads/2021/06/Fact-Sheet-XPressPearlSpill24Jun.pdf' },
      { type: 'Event', label: 'CEDRE X-Press Pearl incident sheet', url: 'https://cedre.fr/en/resources/incident-information-sheets/x-press-pearl' },
      { type: 'Context', label: 'Chemical & Engineering News X-Press Pearl nurdle spill', url: 'https://cen.acs.org/environment/pollution/marine-plastic-spill-xpress-pearl-nurdle/101/i3' },
      { type: 'Context', label: 'Associated Press X-Press Pearl compensation report', url: 'https://apnews.com/article/370ab4b243e761b015ab45976a790b52' },
    ],
  },
  NPDefI: {
    tier: 'Strong',
    basis: 'Iowa corn nutrient-deficiency diagnosis is locally documented by Iowa State, IDALS, and Iowa nutrient-research sources.',
    sources: [
      { type: 'Context', label: 'Iowa State nutrient deficiencies guide', url: 'https://www.agronext.iastate.edu/soilfertility/nutrientdeficiencies.html' },
      { type: 'Context', label: 'IDALS final soil nutrient balance report', url: 'https://www.legis.iowa.gov/docs/APPS/AR/5CDA06E3-F230-4E2B-8FE9-CC1F64BE2CA8/IDALS-Final%20Soil%20Nutrient%20Balance%20Report.pdf' },
      { type: 'Context', label: 'Iowa NREC nitrogen soil sampling project', url: 'https://iowanrec.org/nitrogen-soil-sampling-project/' },
    ],
  },
  PDSDI: {
    tier: 'Strong',
    basis: 'Illinois crop-stress context is locally supported by USDA/NASS and University of Illinois agronomy sources.',
    sources: [
      { type: 'Context', label: 'University of Illinois crop sciences research', url: 'https://cropsciences.illinois.edu/' },
      { type: 'Context', label: 'Illinois crop progress and condition reports', url: 'https://www.nass.usda.gov/Statistics_by_State/Illinois/Publications/Crop_Progress_&_Condition/' },
      { type: 'Context', label: 'Illinois Farmdoc mid-June 2021 corn crop notes', url: 'https://farmdoc.illinois.edu/field-crop-production/mid-june-notes-on-the-2021-corn-crop.html' },
    ],
  },
  CCTTI: {
    tier: 'Strong',
    basis: 'Cover-crop termination is directly supported by USDA, Illinois, and NREC agronomy references for the spring green-up window.',
    sources: [
      { type: 'Context', label: 'Illinois cover crop management resources', url: 'https://extension.illinois.edu/cover-crops' },
      { type: 'Context', label: 'Illinois Department of Agriculture I-COVER program', url: 'https://agr.illinois.gov/resources/landwater/i-cover.html' },
      { type: 'Context', label: 'Illinois NREC 2021 cover crop guide', url: 'https://www.illinoisnrec.org/wp-content/uploads/2021/12/2021-NREC-Cover-Crop-Guide_Dec2021.pdf' },
    ],
  },
  'WDA-CSI': {
    tier: 'Strong',
    basis: 'Everglades Agricultural Area peat subsidence and wetland-edge drainage are locally documented by Everglades, UF/IFAS, and USGS sources.',
    sources: [
      { type: 'Event', label: 'Everglades Foundation on EAA peat subsidence', url: 'https://www.evergladesfoundation.org/post/everglades-restoration-water-and-climate-change' },
      { type: 'Context', label: 'UF/IFAS Everglades Agricultural Area soil subsidence', url: 'https://ask.ifas.ufl.edu/publication/SS523' },
      { type: 'Context', label: 'USGS Everglades subsidence circular summary', url: 'https://fl.water.usgs.gov/Abstracts/c1182_ingebritsen.html' },
    ],
  },
  AMDPHI: {
    tier: 'Strong',
    basis: 'Iron Mountain acid drainage is site-specific and chronic, documented by USGS and EPA sources for the same Superfund setting.',
    sources: [
      { type: 'Event', label: 'USGS Iron Mountain environmental effects profile', url: 'https://ca.water.usgs.gov/projects/iron_mountain/environment.html' },
      { type: 'Context', label: 'EPA Iron Mountain Mine site adaptation profile', url: 'https://www.epa.gov/superfund/site-adaptation-profile-iron-mountain-mine' },
      { type: 'Context', label: 'USGS Iron Mountain Mine history', url: 'https://ca.water.usgs.gov/projects/iron_mountain/history.html' },
      { type: 'Context', label: 'USGS PubTalk on extreme acid mine drainage at Iron Mountain', url: 'https://www.usgs.gov/media/videos/pubtalk-72018-extreme-acid-mine-drainage-iron-mountain-california' },
    ],
  },
  'TDR-ASI': {
    tier: 'Strong',
    basis: 'The Cerro de Pasco mining/tailings bookmark is backed by NASA Earth Observatory, human-rights research, contamination analysis, and health literature.',
    sources: [
      { type: 'Event', label: 'NASA Earth Observatory mining in Cerro de Pasco', url: 'https://science.nasa.gov/earth/earth-observatory/mining-perus-cerro-de-pasco-144481/' },
      { type: 'Context', label: 'Source International Cerro de Pasco case platform', url: 'https://www.source-international.org/news/discover-the-case-of-cerro-de-pasco-through-the-new-platform' },
      { type: 'Context', label: 'UC Berkeley Human Rights Center Cerro de Pasco project', url: 'https://humanrights.berkeley.edu/projects/mining-in-cerro-de-pasco/' },
      { type: 'Context', label: 'SITU Cerro de Pasco environmental-crime documentation', url: 'https://situ.nyc/research/projects/documenting-environmental-crime-in-cerro-de-pasco' },
      { type: 'Context', label: 'Cerro de Pasco children heavy-metal exposure study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8611049/' },
    ],
  },
  'EC-ACI': {
    tier: 'Strong',
    basis: 'Phoenix urban heat is locally documented by Maricopa and Arizona heat-health records; broader WMO context supports the extreme-heat date.',
    sources: [
      { type: 'Event', label: 'WMO July 2019 hottest-month analysis', url: 'https://wmo.int/media/july-matched-and-maybe-broke-record-hottest-month-analysis-began' },
      { type: 'Event', label: 'Maricopa County 2021 heat-associated deaths report', url: 'https://www.maricopa.gov/ArchiveCenter/ViewFile/Item/5494' },
      { type: 'Context', label: 'Arizona DHS 2021 heat morbidity and mortality report', url: 'https://pub.azdhs.gov/health-stats/report/heat/heat2021.pdf' },
      { type: 'Method', label: 'EPA heat island effect reference', url: 'https://www.epa.gov/heat-islands' },
    ],
  },
  HSAI: {
    tier: 'Strong',
    basis: 'NASA urban-heating data, Houston heat surveillance, and Houston urban heat research support the heat-shelter absence bookmark.',
    sources: [
      { type: 'Dataset', label: 'NASA VEDA Urban Heating dashboard', url: 'https://www.earthdata.nasa.gov/dashboard/data-catalog/urban-heating' },
      { type: 'Dataset', label: 'Houston Health heat-related illness surveillance dashboard', url: 'https://www.houstonhealth.org/data-dashboards/houston-summer-surveillance-heat-related-illness-hri-heat-exacerbated-health-monitoring' },
      { type: 'Context', label: 'Cooling Houston with community science heat mapping', url: 'https://storymaps.arcgis.com/stories/1a2868e1573344d6bad0dc30effbee6f' },
      { type: 'Method', label: 'EPA heat island effect reference', url: 'https://www.epa.gov/heatislands/what-are-heat-islands' },
    ],
  },
  PCADI: {
    tier: 'Strong',
    basis: 'Detroit and Michigan pavement-condition records support a pavement-condition demonstration around the bookmark.',
    sources: [
      { type: 'Context', label: 'City of Detroit streets and mobility', url: 'https://detroitmi.gov/departments/department-public-works/complete-streets' },
      { type: 'Dataset', label: 'SEMCOG 2021 pavement condition dataset', url: 'https://hub.arcgis.com/maps/SEMCOG%3A%3Apavement-condition-2021' },
      { type: 'Dataset', label: 'SEMCOG pavement condition open-data layer', url: 'https://maps-semcog.opendata.arcgis.com/datasets/SEMCOG%3A%3Apavement-condition/explore' },
      { type: 'Event', label: 'City of Detroit 2021 pavement and ground-movement report', url: 'https://detroitmi.gov/sites/detroitmi.localhost/files/2021-12/Dearborn%20and%20Fort%20-%20Final%20Geotechnical%20Engineers%20Causal%20Report-compressed.pdf' },
    ],
  },
  LFGVI: {
    tier: 'Strong',
    basis: 'Fresh Kills gas-collection infrastructure and landfill reporting are site-specific and match the landfill-gas vegetation-stress bookmark.',
    sources: [
      { type: 'Event', label: 'Freshkills Park landfill gas collection and processing', url: 'https://freshkillspark.org/landfill-engineering/collection-and-processing' },
      { type: 'Dataset', label: 'New York DEC Fresh Kills landfill gas recovery annual report', url: 'https://extapps.dec.ny.gov/fs/projects/SWMF/Annual%20Reports_Solid%20Waste%20Management%20Facility/Annual%20Reports_by%20Activity%20Type/Landfill/Landfill%20Annual%20Reports%20-%202022/R2/43F21_Fresh_Kills_Landfill_Gas_Recovery_R1_2022.2023-2-24.AR.pdf' },
      { type: 'Context', label: 'NYC Council landfill report', url: 'https://council.nyc.gov/joseph-borelli/wp-content/uploads/sites/52/2017/05/Landfill-Report-FINAL.pdf' },
      { type: 'Context', label: 'Urban Omnibus Fresh Kills leachate and landscape report', url: 'https://urbanomnibus.net/2017/08/capturing-change-leachate-and-landscape/' },
    ],
  },
  'LRD-VSI': {
    tier: 'Strong',
    basis: 'NOAA, local Superfund, and New York DEC sources document Newtown Creek, matching the urban waterway runoff/degradation bookmark.',
    sources: [
      { type: 'Event', label: 'NOAA Newtown Creek hazardous-waste profile', url: 'https://darrp.noaa.gov/hazardous-waste/newtown-creek' },
      { type: 'Context', label: 'Newtown Creek CAG Superfund site overview', url: 'https://newtowncreekcag.org/about-the-superfund-site/' },
      { type: 'Dataset', label: 'New York DEC Newtown Creek long-term control plan', url: 'https://extapps.dec.ny.gov/docs/water_pdf/2017ntcreekltcp.pdf' },
    ],
  },
  TPERI: {
    tier: 'Strong',
    basis: 'Mackenzie Delta thermokarst and permafrost dynamics are locally documented by Canadian permafrost monitoring and Arctic carbon-cycle studies.',
    sources: [
      { type: 'Context', label: 'Natural Resources Canada', url: 'https://natural-resources.canada.ca/' },
      { type: 'Context', label: 'Natural Resources Canada Mackenzie Valley permafrost monitoring publication', url: 'https://ostrnrcan-dostrncan.canada.ca/entities/publication/322833e9-a6fa-41bc-8b67-de66b1b39940' },
      { type: 'Context', label: 'AWI Mackenzie Delta thermokarst lagoon carbon-cycle study', url: 'https://epic.awi.de/id/eprint/60116/' },
      { type: 'Context', label: 'Mackenzie Delta permafrost and lakes report', url: 'https://pubs.aina.ucalgary.ca/cpc/CPC5-131.pdf' },
    ],
  },
  'TT-API': {
    tier: 'Strong',
    basis: 'Western Siberia thermokarst-lake carbon literature matches the bookmark region and thaw/anoxic-peat process.',
    sources: [
      { type: 'Context', label: 'High carbon emissions from thermokarst lakes of Western Siberia', url: 'https://www.nature.com/articles/s41467-019-09592-1' },
      { type: 'Context', label: 'PMC mirror of Western Siberia thermokarst lake emissions study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6449335/' },
      { type: 'Context', label: 'The Cryosphere Western Siberian thermokarst lake waters study', url: 'https://tc.copernicus.org/articles/8/1177/2014/tc-8-1177-2014.pdf' },
    ],
  },
  MEPSI: {
    tier: 'Strong',
    basis: 'Western Siberia thermokarst-lake carbon literature directly supports the methane-ebullition pond bookmark class.',
    sources: [
      { type: 'Context', label: 'High carbon emissions from thermokarst lakes of Western Siberia', url: 'https://www.nature.com/articles/s41467-019-09592-1' },
      { type: 'Context', label: 'PMC mirror of Western Siberia thermokarst lake emissions study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6449335/' },
      { type: 'Context', label: 'The Cryosphere Western Siberian thermokarst lake waters study', url: 'https://tc.copernicus.org/articles/8/1177/2014/tc-8-1177-2014.pdf' },
    ],
  },
  PCEI: {
    tier: 'Strong',
    basis: 'Hudson Bay peatland carbon context is locally supported by peatland literature, conservation synthesis, and global peatland assessment.',
    sources: [
      { type: 'Context', label: 'UNEP Global Peatlands Assessment', url: 'https://www.unep.org/resources/global-peatlands-assessment-2022' },
      { type: 'Context', label: 'WCS Canada Hudson Bay Lowland peatland synthesis', url: 'https://wcscanada.org/about/our-programs/forests-peatlands-and-climate-change/synthesis-of-peatland-knowledge-in-the-hudson-bay-lowland/' },
      { type: 'Context', label: 'NASA NTRS Hudson Bay peat carbon accumulation study', url: 'https://ntrs.nasa.gov/citations/20220008160' },
    ],
  },
  SABSI: {
    tier: 'Strong',
    basis: 'Greenland ice algae and darkening are documented by NOAA climate reporting and peer-reviewed bloom literature; the bookmark is in the summer bloom window.',
    sources: [
      { type: 'Context', label: 'NOAA Arctic Report Card 2021 Greenland Ice Sheet', url: 'https://arctic.noaa.gov/report-card/report-card-2021/greenland-ice-sheet-2/' },
      { type: 'Context', label: 'Climate.gov Arctic Report Card Greenland ice loss summary', url: 'https://www.climate.gov/news-features/featured-images/2021-arctic-report-card-greenland-ice-loss-below-average-2021-despite' },
      { type: 'Context', label: 'Nature Communications Greenland ice-algal bloom mineral phosphorus study', url: 'https://www.nature.com/articles/s41467-020-20627-w' },
    ],
  },
  PDCSI: {
    tier: 'Strong',
    basis: 'INPE/PRODES, TerraBrasilis, and DETER-focused research directly document the Pará deforestation monitoring domain.',
    sources: [
      { type: 'Dataset', label: 'INPE TerraBrasilis PRODES and DETER platform', url: 'https://terrabrasilis.dpi.inpe.br/en/home-page/' },
      { type: 'Dataset', label: 'INPE BiomasBR PRODES monitoring portal', url: 'https://data.inpe.br/biomasbr/prodes-monitoramento-anual-da-supressao-de-vegetacao-nativa/' },
      { type: 'Dataset', label: 'INPE DETER alert system overview', url: 'https://www.gov.br/inpe/pt-br/area-conhecimento/unidade-amazonia/projetos-e-pesquisas/deter' },
      { type: 'Context', label: 'Climate Policy Initiative DETER and Amazon deforestation analysis', url: 'https://www.climatepolicyinitiative.org/publication/through-deters-lens-the-relationship-between-degradation-and-deforestation-in-the-amazon/' },
    ],
  },
  LISI: {
    tier: 'Strong',
    basis: 'Liana infestation is supported by remote-sensing studies and forest-carbon reporting; Borneo degraded-forest context supports the bookmark class.',
    sources: [
      { type: 'Context', label: 'Remote sensing review for liana detection', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12035525/' },
      { type: 'Context', label: 'Leiden University lianas visible from space report', url: 'https://www.universiteitleiden.nl/en/news/2025/05/lianas-are-taking-over-the-rainforests---and-its-visible-from-space' },
      { type: 'Context', label: 'Mongabay lianas and forest carbon uptake report', url: 'https://news.mongabay.com/2022/12/lianas-affect-forest-carbon-uptake-differently-by-region-study-shows/' },
    ],
  },
  DLPEHI: {
    tier: 'Strong',
    basis: 'The 2020-2021 East Africa desert-locust outbreak is directly documented by FAO and NASA/USAID satellite-response reporting.',
    sources: [
      { type: 'Event', label: 'FAO Locust Watch', url: 'https://www.fao.org/ag/locusts/en/info/info/index.html' },
      { type: 'Event', label: 'FAO desert locust crisis response page', url: 'https://www.fao.org/emergencies/where-we-work/desert-locust-crisis/' },
      { type: 'Context', label: 'NASA Earth Observatory satellites and locust invasion response', url: 'https://science.nasa.gov/earth/earth-observatory/could-satellites-help-head-off-a-locust-invasion-146495/' },
    ],
  },
  MHSSP: {
    tier: 'Strong',
    basis: 'NASA DeltaX and Mississippi River Delta wetland studies directly support the hydrology and methane-relevant carbon-process bookmark.',
    sources: [
      { type: 'Event', label: 'NASA DeltaX mission', url: 'https://deltax.jpl.nasa.gov/' },
      { type: 'Context', label: 'NASA DeltaX publications list', url: 'https://deltax.jpl.nasa.gov/science/publications/' },
      { type: 'Context', label: 'FIU Delta-X Mississippi River Delta wetland campaign', url: 'https://wetland.fiu.edu/delta-x-enabling-deltas-to-thrive-in-a-century-of-rising-seas-pi-edward-castaneda' },
      { type: 'Context', label: 'LSU repository Mississippi River Delta wetland methane ebullition study', url: 'https://repository.lsu.edu/oceanography_coastal_pubs/965/' },
    ],
  },
  TFIDI: {
    tier: 'Strong',
    basis: 'Yellow River Delta tidal-flat dynamics are documented by open-access sedimentary-process, tidal-flat mapping, and tidal-creek remote-sensing studies.',
    sources: [
      { type: 'Context', label: 'Frontiers Yellow River Delta tidal-flat sedimentary processes', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1259081/full' },
      { type: 'Context', label: 'Frontiers Yellow River Qingshuigou sub-delta tidal-flat evolution', url: 'https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1286188/full' },
      { type: 'Context', label: 'Journal of Geographical Sciences Yellow River Delta tidal-creek morphology study', url: 'https://www.geogsci.com/EN/10.1007/s11442-021-1915-z' },
    ],
  },
  IPVSI: {
    tier: 'Strong',
    basis: 'Great Lakes Phragmites and regional invasive-plant sources match the Detroit River marsh phenology and invasion target.',
    sources: [
      { type: 'Context', label: 'Great Lakes Phragmites Collaborative', url: 'https://www.greatlakesphragmites.net/' },
      { type: 'Context', label: 'Michigan EGLE invasive Phragmites profile', url: 'https://www.michigan.gov/egle/about/organization/Water-Resources/Wetlands/phragmites' },
      { type: 'Context', label: 'Great Lakes Commission Phragmites adaptive management framework', url: 'https://www.glc.org/work/phragmites' },
      { type: 'Context', label: 'USGS Great Lakes Phragmites science profile', url: 'https://www.usgs.gov/special-topics/great-lakes-restoration-initiative/science/science-topics/phragmites' },
    ],
  },
  WVTDI: {
    tier: 'Strong',
    basis: 'Tour du Valat, Ramsar, and Mediterranean wetland sources match the bookmark place and wetland vegetation-diversity target.',
    sources: [
      { type: 'Context', label: 'Tour du Valat Camargue research institute', url: 'https://tourduvalat.org/en/' },
      { type: 'Context', label: 'Camargue Ramsar site profile', url: 'https://rsis.ramsar.org/ris/346' },
      { type: 'Context', label: 'Tour du Valat Camargue project profile', url: 'https://tourduvalat.org/en/zone/camargue-en/' },
    ],
  },
  WDPTZI: {
    tier: 'Strong',
    basis: 'The Western Siberia peatland transition bookmark is backed by regional thermokarst and peatland-lake literature.',
    sources: [
      { type: 'Context', label: 'The Cryosphere Western Siberian thermokarst lake waters study', url: 'https://tc.copernicus.org/articles/8/1177/2014/tc-8-1177-2014.pdf' },
      { type: 'Context', label: 'High carbon emissions from thermokarst lakes of Western Siberia', url: 'https://www.nature.com/articles/s41467-019-09592-1' },
      { type: 'Context', label: 'PMC mirror of Western Siberia thermokarst lake emissions study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6449335/' },
    ],
  },
  'S1-OWF': {
    tier: 'Strong',
    basis: 'Poyang Lake surface-water dynamics are documented by NASA, flood reporting, and lake-area research; Sentinel-1 method remains supporting context.',
    sources: [
      { type: 'Event', label: 'NASA Earth Observatory Poyang Lake extremes', url: 'https://science.nasa.gov/earth/earth-observatory/poyang-lake-extremes-146987/' },
      { type: 'Event', label: 'ReliefWeb China floods around Poyang Lake', url: 'https://reliefweb.int/report/china/china-battles-unprecedented-floods-around-its-largest-freshwater-lake' },
      { type: 'Context', label: 'Poyang Lake water-area change study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12644651/' },
    ],
  },
  'S1-URB': {
    tier: 'Strong',
    basis: 'Cairo dense urban fabric is supported by DLR settlement footprint, WorldPop, and Cairo urban-heat remote-sensing sources.',
    sources: [
      { type: 'Dataset', label: 'DLR Global Urban Footprint project', url: 'https://www.dlr.de/en/eoc/research-transfer/projects-missions/global-urban-footprint-guf' },
      { type: 'Dataset', label: 'DLR World Settlement Footprint 2019 map service', url: 'https://geoservice.dlr.de/web/maps/eoc%3Awsf2019' },
      { type: 'Context', label: 'WorldPop Cairo urban population context', url: 'https://hub.worldpop.org/geodata/summary?id=49776' },
    ],
  },
  'S1-VVS': {
    tier: 'Strong',
    basis: 'Rondônia forest clearing/canopy contrast is locally supported by NASA, USGS, Global Forest Watch, and MapBiomas sources; Sentinel-1 method remains supporting context.',
    sources: [
      { type: 'Context', label: 'MapBiomas Brazil land cover project', url: 'https://brasil.mapbiomas.org/en/' },
      { type: 'Context', label: 'NASA SVS deforestation in Rondônia', url: 'https://svs.gsfc.nasa.gov/3967' },
      { type: 'Context', label: 'USGS EROS Rondônia Earthshots', url: 'https://eros.usgs.gov/earthshots/rondonia-brazil' },
      { type: 'Dataset', label: 'Global Forest Watch Rondônia dashboard', url: 'https://www.globalforestwatch.org/dashboards/country/BRA/22/' },
    ],
  },
  'S5P-NO2': {
    tier: 'Strong',
    basis: 'North China Plain winter NO2 hotspot is independently documented by TROPOMI/OMI satellite studies; retrieval method remains supporting context.',
    sources: [
      { type: 'Context', label: 'North China Plain NO2 satellite study', url: 'https://www.nature.com/articles/s41598-021-95724-x' },
      { type: 'Context', label: 'ACP China NO2 satellite and ground-observation study', url: 'https://acp.copernicus.org/articles/21/7723/2021/' },
      { type: 'Context', label: 'Frontiers China NO2 column variability study', url: 'https://www.frontiersin.org/journals/environmental-science/articles/10.3389/fenvs.2024.1267627/full' },
    ],
  },
  'S5P-SO2': {
    tier: 'Strong',
    basis: 'La Palma eruption and SO2 plume are event-specific, with volcanic activity and satellite plume transport documented by CAMS, Smithsonian, Terrascope, and NOAA.',
    sources: [
      { type: 'Event', label: 'CAMS monitoring of La Palma SO2 plume', url: 'https://atmosphere.copernicus.eu/cams-monitors-transport-so2-la-palma-volcano' },
      { type: 'Event', label: 'Smithsonian Global Volcanism Program La Palma profile', url: 'https://volcano.si.edu/volcano.cfm?vn=383010' },
      { type: 'Event', label: 'Smithsonian La Palma eruption monthly report', url: 'https://volcano.si.edu/showreport.cfm?doi=10.5479%2Fsi.GVP.BGVN202110-383010' },
      { type: 'Context', label: 'Terrascope satellite monitoring of La Palma SO2 transport', url: 'https://terrascope.be/en/news-events/monitoring-volcano-ash-plumes-la-palma-different-satellites' },
    ],
  },
};

export function getAtlasVerification(index) {
  return ATLAS_VERIFICATION[index.acronym] || null;
}
