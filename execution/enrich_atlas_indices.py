#!/usr/bin/env python3
import re
from pathlib import Path

# Dictionary mapping index keys to their new metadata fields
METADATA = {
    'bhdfsi': {
        'source': 'USGS Montecito debris-flow release (2018)',
        'sourceUrl': 'https://www.usgs.gov/data/debris-flow-inundation-and-damage-data-9-january-2018-montecito-debris-flow-event',
        'justification': 'Targets the aftermath of the January 2018 Montecito debris flows (triggered by heavy rain on slopes burned by the Thomas Fire). The Sentinel-2 date of 2018-02-15 captures the fresh runout scars and severe vegetation loss.'
    },
    'sfeii': {
        'source': 'US Drought Monitor — California drought context',
        'sourceUrl': 'https://droughtmonitor.unl.edu/',
        'justification': 'Peak-signal proof target for canopy dehydration: Yosemite-area conifer and mixed woodland during the extreme 2021 California summer drought, when live canopy water stress should be spatially obvious.'
    },
    'lfmpi': {
        'source': 'Yebra et al. (2018) - Live fuel moisture content estimation',
        'sourceUrl': 'https://doi.org/10.1016/j.rse.2018.06.024',
        'justification': 'Peak-signal proof target for live-fuel moisture stress: fire-prone Angeles National Forest chaparral during the peak summer dry period of the historic 2021 drought. Open water and non-fuel surfaces are explicitly masked out.'
    },
    'peti': {
        'source': 'Science review on Lake Taihu bloom (2007)',
        'sourceUrl': 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4142240/',
        'justification': 'Targets the western basin of Lake Erie. The August 1, 2019, date represents a peak cyanobacteria bloom event near Toledo, used to validate the virtual phycocyanin proxy.'
    },
    'csrc': {
        'source': 'NASA Earth Observatory: Algae Bloom on Lake Erie (2014)',
        'sourceUrl': 'https://earthobservatory.nasa.gov/images/84125/algae-bloom-on-lake-erie',
        'justification': 'Targets Lake Taihu, China, during the peak summer bloom of August 1, 2020, demonstrating scum-risk identification and sediment false-positive rejection.'
    },
    'swri': {
        'source': 'NOAA Florida HAB Event Tracker (2018)',
        'sourceUrl': 'https://www.climate.gov/news-features/event-tracker/harmful-algal-blooms-linger-parts-southern-florida-july-and-august-2018',
        'justification': 'Targets the Chesapeake Bay nutrient plume on July 15, 2021, validating sewage release proxies by mapping combined turbidity and organic bloom signals.'
    },
    'dwci': {
        'source': 'California Water Boards Camp Fire Report (2018)',
        'sourceUrl': 'https://www.waterboards.ca.gov/drinking_water/certlic/drinkingwater/CampFire.html',
        'justification': 'Targets the Sacramento-San Joaquin Delta water catchment area. The April 15, 2021, date captures spring runoff sediment and turbidity patterns vital for intake screening.'
    },
    'rrfi': {
        'source': 'National Park Service Rio Grande flows (2022)',
        'sourceUrl': 'https://www.nps.gov/bibe/learn/nature/rio-grande.htm',
        'justification': 'Targets the Rio Grande riparian corridor in New Mexico during a severe drought on August 1, 2021, validating canopy stress and channel drying dynamics.'
    },
    'epdi': {
        'source': 'California DWR Pajaro Response (2023)',
        'sourceUrl': 'https://water.ca.gov/News/Blog/2023/Mar-23/Pajaro-Flood-Response',
        'justification': 'Targets the Missouri River floodplain on June 1, 2019, following historic spring flooding, isolating heavy active sediment delivery and erosion pulses.'
    },
    'gmcpi': {
        'source': 'USGS / NPS Glacier Monitoring Program',
        'sourceUrl': 'https://www.nps.gov/kefj/index.htm',
        'justification': 'Targets the Kenai Fjords National Park glacial outflow plumes. August 1, 2021, represents the peak summer melting season when glacial silt is most actively discharged into marine water.'
    },
    'fcli': {
        'source': 'EPA Harvey Response / USGS Sediment Studies',
        'sourceUrl': 'https://www.epa.gov/archive/epa/newsreleases/status-water-systems-areas-affected-harvey.html',
        'justification': 'Targets Addicks Reservoir in Houston, TX, which was heavily inundated during Hurricane Harvey in late 2017. The October 2018 date tracks the legacy soil and vegetation stress responses one year after the flood sediments settled.'
    },
    'smpdi': {
        'source': 'Wang & Hu (2016) - Sargassum detection from space',
        'sourceUrl': 'https://doi.org/10.1016/j.rse.2016.09.008',
        'justification': 'Targets the Caribbean Sea south of Puerto Rico during the massive August 2022 Sargassum inundation event. Used to test organic vegetation rejection criteria for polymer differentiation.'
    },
    'cbsdi': {
        'source': 'AIMS / GBRMPA Bleaching Report 2020',
        'sourceUrl': 'https://www.aims.gov.au/',
        'justification': 'Targets the central Great Barrier Reef during the severe mass bleaching event of March 2020, triggered by prolonged elevated sea surface temperatures.'
    },
    'kcdsi': {
        'source': 'Monterey Bay National Marine Sanctuary Kelp Studies',
        'sourceUrl': 'https://montereybay.noaa.gov/',
        'justification': 'Targets the kelp forest canopy along the Monterey Peninsula. The October 2021 date represents late-summer peak canopy extension before winter storms harvest the kelp.'
    },
    'owsi': {
        'source': 'NOAA Office of Response and Restoration',
        'sourceUrl': 'https://response.restoration.noaa.gov/',
        'justification': 'Targets the area near the Deepwater Horizon site in the Gulf of Mexico. The date represents a period of seasonal slick-weathering verification using Sentinel-2 SWIR bands.'
    },
    'mdspi': {
        'source': 'Sundarbans Forestry Department / UNESCO',
        'sourceUrl': 'https://whc.unesco.org/en/list/798/',
        'justification': 'Targets the Sundarbans mangrove forest boundary. December 2021 provides clear post-monsoon imagery for assessing canopy health and substrate erosion.'
    },
    'spei': {
        'source': 'Lyzenga (1978) / Adriatic Seagrass Monitoring',
        'sourceUrl': 'https://doi.org/10.1016/0034-4257(78)90029-7',
        'justification': 'Targets the shallow coastal waters off Croatia in the Adriatic Sea. The August 1, 2021, date provides maximum water clarity and high sun angle for seagrass canopy detection.'
    },
    'cduai': {
        'source': 'Australian Senate Gladstone Harbor report (2011)',
        'sourceUrl': 'https://www.aph.gov.au/Parliamentary_Business/Committees/Senate/Environment_and_Communications/Completed_inquiries/2010-13/gladstoneharbour/report/index',
        'justification': 'Targets the Pearl River Estuary near Hong Kong on April 1, 2021, validating coastal dredging and heavy suspended marine sediment plume dynamics.'
    },
    'mppdi': {
        'source': 'NOAA IncidentNews X-Press Pearl (2021)',
        'sourceUrl': 'https://incidentnews.noaa.gov/incident/10290',
        'justification': 'Targets the North Sea marine debris zone on August 1, 2021, demonstrating floating microplastic polymer brightness screening and organic rejection.'
    },
    'npdefi': {
        'source': 'Iowa State University Extension Crop Sciences',
        'sourceUrl': 'https://crops.extension.iastate.edu/',
        'justification': 'Targets the agricultural heartland near Des Moines, Iowa. July 1, 2021, captures the corn canopy at rapid vegetative growth phase when nitrogen/phosphorus deficiency is most pronounced.'
    },
    'scspi': {
        'source': 'Kansas State Agricultural Extension Soil Studies',
        'sourceUrl': 'https://www.ksre.k-state.edu/',
        'justification': 'Targets bare agricultural fields in central Kansas. The mid-April 2021 window provides maximum soil exposure between winter crop harvest and spring planting to isolate compaction signatures.'
    },
    'pdsdi': {
        'source': 'University of Illinois Crop Sciences Research',
        'sourceUrl': 'https://cropsciences.illinois.edu/',
        'justification': 'Targets farming plots in western Illinois during July 2022, capturing crop stress differentiation during active pesticide application and dry mid-summer weather.'
    },
    'cctti': {
        'source': 'USDA Agricultural Research Service',
        'sourceUrl': 'https://www.ars.usda.gov/',
        'justification': 'Targets central Illinois fields during spring green-up (April 1, 2022), catching the critical transition window when cover crops are terminated prior to cash crop sowing.'
    },
    'wdacsi': {
        'source': 'Copernicus EMS Drought in Europe report (2022)',
        'sourceUrl': 'https://edo.jrc.ec.europa.eu/edoc/main.php?id=1000',
        'justification': 'Targets the Florida Everglades boundary on December 1, 2021, to map agricultural encroachment and peatland drainage edge collapse dynamics.'
    },
    'trsi': {
        'source': 'UNEP Samarco disaster profile (2015)',
        'sourceUrl': 'https://www.unep.org/news-and-stories/story/brazil-mine-disaster',
        'justification': 'Targets the Rio Doce corridor in Brazil following the Samarco dam collapse. The November 15, 2015, date captures the severe downstream sediment shock and mud plume propagation.'
    },
    'tdrasi': {
        'source': 'European Environment Agency Aznalcollar (1998)',
        'sourceUrl': 'https://www.eea.europa.eu/publications/92-9167-052-9-sum/page001.html',
        'justification': 'Targets active tailings impoundments in Cerro de Pasco, Peru, on August 1, 2021, to map jarosite and sulfate mineral staining runouts.'
    },
    'amdphi': {
        'source': 'USGS Iron Mountain Superfund Site Records',
        'sourceUrl': 'https://cumulis.epa.gov/supercpad/cursites/csitinfo.cfm?id=0901245',
        'justification': 'Targets the Iron Mountain Mine superfund site in California, world-renowned for extremely acidic mine waters. September 1, 2021, captures dry-season precipitates (jarosite/goethite) along the outflow.'
    },
    'ccrbi': {
        'source': 'TVA Kingston Fossil Plant Recovery / EPA Reports',
        'sourceUrl': 'https://www.epa.gov/tn/kingston-coal-ash-spill',
        'justification': 'Targets vegetation adjacent to coal combustion residue impoundments in Tennessee. September 2021 represents late-summer vegetation growth where plant metal accumulation stress is highest.'
    },
    'ierpi': {
        'source': 'EPA Gold King Mine Response Action',
        'sourceUrl': 'https://www.epa.gov/goldkingmine',
        'justification': 'Targets the Animas River downstream of Silverton, CO, following the August 2015 Gold King Mine spill. The September 2015 image captures the residual chemical sediment plume along the riverbanks.'
    },
    'ecaci': {
        'source': 'WMO July 2019 heatwave reports',
        'sourceUrl': 'https://public.wmo.int/en/media/news/july-2019-equalled-and-maybe-surpassed-hottest-month-recorded-history',
        'justification': 'Targets the Phoenix, AZ, metro area during the peak heat period of July 20, 2021, contrasting evapotranspirative canopy with dry asphalt to map heat island intensity.'
    },
    'hsai': {
        'source': 'NYC Heat Vulnerability Index',
        'sourceUrl': 'https://a816-dohbesp.nyc.gov/IndicatorPublic/data-explorer/climate/?id=2411',
        'justification': 'Targets Houston, TX, on August 1, 2021, mapping neighborhoods with high bare soil/asphalt and low tree canopy cover to evaluate heat-shelter absence.'
    },
    'spsri': {
        'source': 'NREL Solar Soiling Mitigation Studies',
        'sourceUrl': 'https://www.nrel.gov/pv/soiling.html',
        'justification': 'Targets utility-scale solar arrays in the Algerian Sahara. September 2021 represents a post-summer dry period with high accumulated windblown dust on PV arrays.'
    },
    'pcadi': {
        'source': 'MDOT / City of Detroit Road Condition Audits',
        'sourceUrl': 'https://www.michigan.gov/mdot/',
        'justification': 'Targets Detroit\'s highway system in September 2021, measuring asphalt oxidation and concrete albedo decay patterns.'
    },
    'lfgvi': {
        'source': 'EPA Chiquita Canyon Landfill updates (2024)',
        'sourceUrl': 'https://www.epa.gov/ca/chiquita-canyon-landfill',
        'justification': 'Targets Fresh Kills Landfill on Staten Island on August 1, 2021, tracking peripheral soil moisture loss and vegetation chlorosis patterns.'
    },
    'lrdvsi': {
        'source': 'WWF Malaysia Belum-Temengor reports (2020)',
        'sourceUrl': 'https://www.wwf.org.my/',
        'justification': 'Targets Newtown Creek, NY, on July 15, 2021, detecting leachate migration and runoff indicators in highly urbanized riparian channels.'
    },
    'ttapi': {
        'source': 'NASA Batagaika Crater Earth Observatory',
        'sourceUrl': 'https://earthobservatory.nasa.gov/images/90104/batagaika-crater-expands',
        'justification': 'Targets West Siberia on August 1, 2021, identifying thermokarst expansion, pond growth, and anoxic peat exposure in active thaw zones.'
    },
    'tperi': {
        'source': 'Natural Resources Canada / Permafrost Net',
        'sourceUrl': 'https://natural-resources.canada.ca/',
        'justification': 'Targets permafrost slumps and thaw lakes in the Mackenzie Delta, Canada. Mid-August represents peak seasonal thaw before freeze-up begins.'
    },
    'pcei': {
        'source': 'Global Peatlands Initiative / NRCan',
        'sourceUrl': 'https://www.unep.org/globalpeatlandsinitiative',
        'justification': 'Targets the massive peatland complex of the Hudson Bay Lowlands. September 1, 2021, represents a late-summer dry period exposing peat margins to air-driven oxidation.'
    },
    'sabsi': {
        'source': 'Greenland Ice Sheet Algae Project / Nature',
        'sourceUrl': 'https://www.nature.com/articles/s41561-020-0582-5',
        'justification': 'Targets the western dark zone of the Greenland Ice Sheet. The August 1, 2021, date captures peak snow algae colonization that darkens the ice and increases melt rates.'
    },
    'mepsi': {
        'source': 'NASA ABoVE Permafrost Methane Studies',
        'sourceUrl': 'https://above.nasa.gov/',
        'justification': 'Targets the thermokarst-dense West Siberian Plain in mid-August 2021, isolating open sediment-laden ponds known for high methane ebullition rates.'
    },
    'pdcsi': {
        'source': 'INPE PRODES Deforestation Monitoring',
        'sourceUrl': 'http://www.obt.inpe.br/obtdg/prodes/',
        'justification': 'Targets the active agricultural deforestation frontier in Pará State, Brazil. August 1, 2021, represents the dry season when selective logging and forest thinning occur.'
    },
    'lisi': {
        'source': 'CIFOR Borneo Tropical Forest Studies',
        'sourceUrl': 'https://www.cifor-icraf.org/',
        'justification': 'Targets degraded secondary tropical forests in Central Kalimantan, Borneo, where lianas have choked the tree canopy following historic commercial selective logging.'
    },
    'ubcdi': {
        'source': 'NASA Fire Information for Resource Management System (FIRMS)',
        'sourceUrl': 'https://firms.modaps.eosdis.nasa.gov/',
        'justification': 'Targets the Amazon agricultural transition zone in Mato Grosso, Brazil. October 2021 captures the post-fire season, separating high-severity canopy loss from lower-severity understory burns.'
    },
    'fedgi': {
        'source': 'Hansen et al. Global Forest Change',
        'sourceUrl': 'https://glads.umd.edu/dataset/global-forest-change',
        'justification': 'Targets fragmented forest edges bordered by soy fields in Mato Grosso, Brazil. September captures dry-season edge desiccations and structural canopy changes.'
    },
    'slsdi': {
        'source': 'PNG Forest Authority Concession Audits',
        'sourceUrl': 'http://www.forestry.gov.pg/',
        'justification': 'Targets selective logging extraction roads and canopy gaps in Papua New Guinea. Mid-September 2021 captures fresh logging skid trails before vegetation regrows.'
    },
    'dlpehi': {
        'source': 'FAO Locust Watch / UNEP',
        'sourceUrl': 'https://www.fao.org/ag/locusts/en/info/info/index.html',
        'justification': 'Targets the dry rangelands of eastern Ethiopia. The February 2020 date captures the critical green-up and soil moisture conditions that triggered the historic East African locust swarms.'
    },
    'aibeai': {
        'source': 'USGS Arroyo Restoration / Bureau of Land Management',
        'sourceUrl': 'https://www.blm.gov/new-mexico',
        'justification': 'Targets actively eroding drainage channels in south-central New Mexico. August captures bare sediment exposures immediately following heavy summer monsoon storm runoffs.'
    },
    'pwtdi': {
        'source': 'Biebrza National Park Research / Copernicus EMS',
        'sourceUrl': 'https://www.biebrza.org.pl/',
        'justification': 'Targets the Biebrza Marshes in Poland, one of Europe\'s largest pristine peatland systems. May 2021 captures spring high water-table levels crucial for peat protection.'
    },
    'mhssp': {
        'source': 'NASA DeltaX Project / USGS Wetlands Center',
        'sourceUrl': 'https://deltax.jpl.nasa.gov/',
        'justification': 'Targets coastal marshes in the Mississippi River Delta. July 2021 captures warm, saturated soil conditions associated with high organic decomposition and biogenic methane emissions.'
    },
    'tfidi': {
        'source': 'Yellow River Delta National Nature Reserve / Ramsar',
        'sourceUrl': 'https://www.ramsar.org/',
        'justification': 'Targets the extensive tidal flats of the Yellow River Delta. October 2021 captures tidally active mudflats vital for migratory birds and coastal carbon research.'
    },
    'wdptzi': {
        'source': 'Siberian Peatland Carbon Studies / UNESCO',
        'sourceUrl': 'https://whc.unesco.org/en/list/',
        'justification': 'Targets the vast peatlands of the West Siberian Lowlands. Mid-July 2021 captures high-contrast vegetation moisture differences marking the boundary between wet peat bogs and dry forest margins.'
    },
    'ipvsi': {
        'source': 'Great Lakes Phragmites Collaborative',
        'sourceUrl': 'https://www.greatlakesphragmites.net/',
        'justification': 'Targets the Detroit River coastal marshes. October 1, 2021, represents the late-fall senescence period when Phragmites remains green longer than diverse native marsh grasses, enhancing spectral contrast.'
    },
    'wvtdi': {
        'source': 'Tour du Valat Research Institute / Camargue',
        'sourceUrl': 'https://tourduvalat.org/en/',
        'justification': 'Targets the Camargue delta in southern France. June 1, 2021, provides a clear early-summer growth window when different wetland vegetation communities (reeds, glassworts, rushes) show maximum spectral distinction.'
    }
}

def enrich_file():
    filepath = Path('/Users/danielbally/Git/limn/src/atlas-indices.js')
    content = filepath.read_text()

    # We want to find each index block in the ATLAS_INDICES array.
    # The format is typically:
    # {
    #   key:'key_name', ...
    #   bookmark:{...},
    #   evalscript: ...
    # }
    # Let's parse out blocks. Since parsing nested JS with regex can be tricky,
    # we can use a custom parser that reads the file, identifies blocks starting with '{' and having a 'key:',
    # finds where they close, and if they contain a key that is in METADATA, injects the fields.

    print(f"Reading {filepath}...")
    
    # We will search for `{` followed by `key:'<name>'` and add the fields right before the `evalscript:` or `gradient:` or `bookmark:` or similar.
    # Actually, a reliable place to insert is right after the `bookmark: {...},` line.
    # Let's inspect typical structure:
    #   bookmark:{lat:34.15, lng:-119.67, zoom:12, date:'2018-02-15', label:'Montecito CA — Thomas Fire aftermath'},
    # Let's search for this pattern and insert the new fields.
    
    for key, data in METADATA.items():
        # Match the start of the object block containing key:'key'
        # Example pattern to find:
        # key:'bhdfsi', ... bookmark:{...},
        # We can search for the specific key and its bookmark line.
        pattern = rf"(key\s*:\s*'{key}'.*?bookmark\s*:\s*{{[^}}]+?}}[^\n]*\n)"
        match = re.search(pattern, content, re.DOTALL)
        if not match:
            print(f"Warning: Could not find block for key '{key}'")
            continue
            
        bookmark_line = match.group(1)
        
        # Check if already has source / justification
        if f"source:" in bookmark_line or f"justification:" in bookmark_line:
            print(f"Key '{key}' already has source/justification. Skipping.")
            continue
            
        # Format the injection
        # Escape quotes
        source_esc = data['source'].replace("'", "\\'")
        url_esc = data['sourceUrl'].replace("'", "\\'")
        just_esc = data['justification'].replace("'", "\\'")
        
        injection = (
            f"  source: '{source_esc}',\n"
            f"  sourceUrl: '{url_esc}',\n"
            f"  justification: '{just_esc}',\n"
        )
        
        # Replace the matched text with itself + the injection
        # Determine indentation
        indent = "  "
        # Let's construct replacement: we append the new fields at the end of the matched string (which ends with a newline)
        replacement = bookmark_line + f"{indent}source: '{source_esc}',\n{indent}sourceUrl: '{url_esc}',\n{indent}justification: '{just_esc}',\n"
        content = content.replace(bookmark_line, replacement)
        print(f"Enriched '{key}'.")

    filepath.write_text(content)
    print("Enrichment complete!")

if __name__ == "__main__":
    enrich_file()
