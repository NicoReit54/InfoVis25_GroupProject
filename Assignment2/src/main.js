import { createMap, crimeTypeColors, districtMap } from "./map.js";
import { createScatter } from "./scatter.js";
import { createHistogram } from "./histogram_v2.js";
import { createTreemap } from "./treemap.js";
import { createCrimeBar } from "./crimeBar.js";
import { createPriceByRoom } from "./priceByRoom.js";

const state = {
    global: {
        selectedNeighborhoods: new Set(),
        selectedRoomTypes: new Set(),
        brushBounds: null,
        selectedCrimeTypes: new Set(),
        showAirbnb: true
    },
    local: {
        treemap: { level1: "rating_bucket", level2: "room_type", level3: "property_type" },
        crossFilter: { priceBucket: null, priceBounds: null, treemapFeature: null }
    }
};

let globalData = { airbnb: [], crime: [], crimeRaw: [], geo: null };
let mapInstance = null;

function populateDropdowns(airbnbData, crimeTypes) {
    const neighborhoodSelect = document.getElementById("neighborhoodSelect");
    neighborhoodSelect.innerHTML = "";
    
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All Districts";
    neighborhoodSelect.appendChild(allOption);

    const districts = ['Far North', 'Northwest', 'North Side', 'West Side', 'Central', 'South Side', 'Southwest'];
    districts.forEach(district => {
        const option = document.createElement("option");
        option.value = district;
        option.textContent = district;
        neighborhoodSelect.appendChild(option);
    });

    const roomTypeSelect = document.getElementById("roomTypeSelect");
    roomTypeSelect.innerHTML = "";
    
    const allRoomOption = document.createElement("option");
    allRoomOption.value = "All";
    allRoomOption.textContent = "All Room Types";
    roomTypeSelect.appendChild(allRoomOption);

    const roomTypes = Array.from(new Set(airbnbData.map(d => d.room_type).filter(d => d && d.trim() !== ""))).sort();
    roomTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        roomTypeSelect.appendChild(option);
    });

    const crimeTypeContainer = document.getElementById("crimeTypeFilters");
    if (crimeTypeContainer) {
        crimeTypeContainer.innerHTML = "";
        
        // Airbnb toggle
        const airbnbToggle = document.createElement("label");
        airbnbToggle.className = "toggle-label airbnb-toggle";
        const airbnbSwitch = document.createElement("input");
        airbnbSwitch.type = "checkbox";
        airbnbSwitch.checked = state.global.showAirbnb;
        airbnbSwitch.addEventListener("change", (e) => {
            state.global.showAirbnb = e.target.checked;
            if (mapInstance) {
                const filteredAirbnb = applyFilters(globalData);
                mapInstance.setAirbnbVisibility(state.global.showAirbnb, filteredAirbnb);
            }
        });
        const airbnbSlider = document.createElement("span");
        airbnbSlider.className = "slider";
        airbnbToggle.appendChild(airbnbSwitch);
        airbnbToggle.appendChild(airbnbSlider);
        airbnbToggle.appendChild(document.createTextNode(" Airbnb"));
        crimeTypeContainer.appendChild(airbnbToggle);
        
        const separator = document.createElement("hr");
        separator.style.margin = "0.5rem 0";
        separator.style.border = "none";
        separator.style.borderTop = "1px solid #ddd";
        crimeTypeContainer.appendChild(separator);
        
        // All Crimes toggle
        const allCrimesToggle = document.createElement("label");
        allCrimesToggle.className = "toggle-label all-crimes-toggle";
        const allCrimesSwitch = document.createElement("input");
        allCrimesSwitch.type = "checkbox";
        allCrimesSwitch.checked = true;
        allCrimesSwitch.addEventListener("change", (e) => {
            const crimeCheckboxes = crimeTypeContainer.querySelectorAll(".crime-type-toggle input");
            crimeCheckboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const type = cb.dataset.crimeType;
                if (e.target.checked) state.global.selectedCrimeTypes.add(type);
                else state.global.selectedCrimeTypes.delete(type);
            });
            if (mapInstance) mapInstance.updateCrimePoints(globalData.crimeRaw, state.global.selectedCrimeTypes);
            renderAll();
        });
        const allCrimesSlider = document.createElement("span");
        allCrimesSlider.className = "slider";
        allCrimesToggle.appendChild(allCrimesSwitch);
        allCrimesToggle.appendChild(allCrimesSlider);
        allCrimesToggle.appendChild(document.createTextNode(" All Crimes"));
        crimeTypeContainer.appendChild(allCrimesToggle);
        
        // Crime type toggles
        if (crimeTypes.length > 0) {
            crimeTypes.forEach(type => {
                state.global.selectedCrimeTypes.add(type);
                const label = document.createElement("label");
                label.className = "toggle-label crime-type-toggle";
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = true;
                checkbox.dataset.crimeType = type;
                
                checkbox.addEventListener("change", (e) => {
                    if (e.target.checked) state.global.selectedCrimeTypes.add(type);
                    else state.global.selectedCrimeTypes.delete(type);
                    
                    const allCrimesCheckbox = crimeTypeContainer.querySelector(".all-crimes-toggle input");
                    const allCheckboxes = crimeTypeContainer.querySelectorAll(".crime-type-toggle input");
                    allCrimesCheckbox.checked = Array.from(allCheckboxes).every(cb => cb.checked);
                    
                    if (mapInstance) mapInstance.updateCrimePoints(globalData.crimeRaw, state.global.selectedCrimeTypes);
                    renderAll();
                });
                
                const slider = document.createElement("span");
                slider.className = "slider";
                slider.style.setProperty('--toggle-color', crimeTypeColors[type] || crimeTypeColors['OTHER']);
                label.appendChild(checkbox);
                label.appendChild(slider);
                label.appendChild(document.createTextNode(" " + type));
                crimeTypeContainer.appendChild(label);
            });
        }
    }
}

function applyFilters(data) {
    let filtered = data.airbnb;

    if (state.global.selectedNeighborhoods.size > 0) {
        const selection = Array.from(state.global.selectedNeighborhoods);

        filtered = filtered.filter(d => {
            const airbnbName = d.neighbourhood_cleansed;
            const district = districtMap[airbnbName];

            return selection.some(selected => 
                district === selected || 
                (airbnbName && airbnbName.includes(selected))
            );
        });
    }

    if (state.global.selectedRoomTypes.size > 0) {
        filtered = filtered.filter(d => state.global.selectedRoomTypes.has(d.room_type));
    }

    if (state.global.brushBounds) {
        const b = state.global.brushBounds;
        filtered = filtered.filter(d => 
            d.longitude >= b.minLng && d.longitude <= b.maxLng &&
            d.latitude >= b.minLat && d.latitude <= b.maxLat
        );
    }

    return filtered;
}

// Filter für Crimes (inkl. brushBounds)
function applyFiltersToCrimes(crimeRaw) {
    let filtered = crimeRaw;
    
    if (state.global.selectedNeighborhoods.size > 0) {
        filtered = filtered.filter(crime => {
            const district = districtMap[crime.neighbourhood_cleansed];
            return state.global.selectedNeighborhoods.has(district) || 
                   state.global.selectedNeighborhoods.has(crime.neighbourhood_cleansed);
        });
    }
    
    // Brush-Filter auch auf Crimes anwenden
    if (state.global.brushBounds) {
        const b = state.global.brushBounds;
        filtered = filtered.filter(d => 
            d.longitude >= b.minLng && d.longitude <= b.maxLng &&
            d.latitude >= b.minLat && d.latitude <= b.maxLat
        );
    }
    
    return filtered;
}

function aggregateCrimeData(crimeRaw, selectedCrimeTypes, selectedNeighborhoods, brushBounds) {
    let filteredCrimes = selectedCrimeTypes && selectedCrimeTypes.size > 0
        ? crimeRaw.filter(d => selectedCrimeTypes.has(d.primary_type))
        : crimeRaw;
    
    if (selectedNeighborhoods && selectedNeighborhoods.size > 0) {
        filteredCrimes = filteredCrimes.filter(crime => {
            const district = districtMap[crime.neighbourhood_cleansed];
            return selectedNeighborhoods.has(district) || 
                   selectedNeighborhoods.has(crime.neighbourhood_cleansed);
        });
    }
    
    // Brush-Filter auch für aggregierte Daten
    if (brushBounds) {
        const b = brushBounds;
        filteredCrimes = filteredCrimes.filter(d => 
            d.longitude >= b.minLng && d.longitude <= b.maxLng &&
            d.latitude >= b.minLat && d.latitude <= b.maxLat
        );
    }
    
    const crimeByNeighborhood = d3.rollup(filteredCrimes, v => v.length, d => d.neighbourhood_cleansed);
    return Array.from(crimeByNeighborhood, ([neighbourhood_cleansed, crime_count]) => ({
        neighbourhood_cleansed, crime_count
    }));
}

function applyHistogramFilter(data) {
    if (!state.local.crossFilter.treemapFeature) return data;
    const f = state.local.crossFilter.treemapFeature;
    return data.filter(d => d[f.level1] === f.l1 && d[f.level2] === f.l2 && d[f.level3] === f.l3);
}

function applyTreemapFilter(data) {
    if (!state.local.crossFilter.priceBounds) return data;
    const b = state.local.crossFilter.priceBounds;
    return data.filter(d => d.price >= b.min && d.price < b.max);
}

function updateFilterStatus(filteredCount, totalCount) {
    const statusEl = document.getElementById("filterStatus");
    if (statusEl) statusEl.textContent = `Showing ${filteredCount} of ${totalCount} listings`;
}

function resetCrossFilters() {
    state.local.crossFilter.priceBucket = null;
    state.local.crossFilter.priceBounds = null;
    state.local.crossFilter.treemapFeature = null;
}

function renderAll() {
    const filteredAirbnb = applyFilters(globalData);
    const filteredCrimes = applyFiltersToCrimes(globalData.crimeRaw);
    console.log("Gewählte Nachbarschaften:", state.global.selectedNeighborhoods);
    console.log("Gefundene Airbnbs:", filteredAirbnb.length);
    updateFilterStatus(filteredAirbnb.length, globalData.airbnb.length);

    if (mapInstance) {
        mapInstance.updatePoints(filteredAirbnb);
        mapInstance.updateCrimePoints(filteredCrimes, state.global.selectedCrimeTypes);
        
        const selectedNeighborhoods = new Set();
        state.global.selectedNeighborhoods.forEach(item => {
            if (Object.values(districtMap).includes(item)) {
                Object.entries(districtMap).forEach(([neighborhood, d]) => {
                    if (d === item) selectedNeighborhoods.add(neighborhood);
                });
            } else {
                selectedNeighborhoods.add(item);
            }
        });
        mapInstance.updateNeighborhoodHighlight(selectedNeighborhoods);
    }

    const aggregatedCrime = aggregateCrimeData(
        globalData.crimeRaw, 
        state.global.selectedCrimeTypes, 
        state.global.selectedNeighborhoods,
        state.global.brushBounds
    );
    
    createScatter("#scatter", filteredAirbnb, aggregatedCrime, state.global.selectedNeighborhoods, onScatterClick);

    const histogramData = applyHistogramFilter(filteredAirbnb);
    createHistogram("#histogram", histogramData, 
        state.global.selectedNeighborhoods.size === 1 ? Array.from(state.global.selectedNeighborhoods)[0] : "Multiple",
        onHistogramBarClick, state.local.crossFilter.priceBucket);

    const treemapData = applyTreemapFilter(filteredAirbnb);
    const { level1, level2, level3 } = state.local.treemap;
    createTreemap("#treemap", treemapData, level1, level2, level3, onTreemapCellClick, state.local.crossFilter.treemapFeature);

    createCrimeBar("#crimeBar", aggregatedCrime, filteredAirbnb, state.global.selectedNeighborhoods, onCrimeBarClick);

    createPriceByRoom("#priceByRoom", filteredAirbnb, 
        state.global.selectedNeighborhoods.size === 1 ? Array.from(state.global.selectedNeighborhoods)[0] : "Multiple",
        onPriceByRoomClick,
        state.global.selectedRoomTypes.size === 1 ? Array.from(state.global.selectedRoomTypes)[0] : null);
}

function onScatterClick(neighborhood, ctrlKey) {
    if (!ctrlKey) {
        state.global.selectedRoomTypes.clear();
        resetCrossFilters();
        if (state.global.selectedNeighborhoods.has(neighborhood) && state.global.selectedNeighborhoods.size === 1) {
            state.global.selectedNeighborhoods.clear();
        } else {
            state.global.selectedNeighborhoods.clear();
            state.global.selectedNeighborhoods.add(neighborhood);
        }
    } else {
        if (state.global.selectedNeighborhoods.has(neighborhood)) state.global.selectedNeighborhoods.delete(neighborhood);
        else state.global.selectedNeighborhoods.add(neighborhood);
    }
    syncDropdowns();
    renderAll();
}

function onCrimeBarClick(neighborhood, ctrlKey) {
    if (!ctrlKey) {
        state.global.selectedRoomTypes.clear();
        resetCrossFilters();
        if (state.global.selectedNeighborhoods.has(neighborhood) && state.global.selectedNeighborhoods.size === 1) {
            state.global.selectedNeighborhoods.clear();
        } else {
            state.global.selectedNeighborhoods.clear();
            state.global.selectedNeighborhoods.add(neighborhood);
        }
    } else {
        if (state.global.selectedNeighborhoods.has(neighborhood)) state.global.selectedNeighborhoods.delete(neighborhood);
        else state.global.selectedNeighborhoods.add(neighborhood);
    }
    syncDropdowns();
    renderAll();
}

function onHistogramBarClick(category, bounds, ctrlKey) {
    if (!ctrlKey) state.local.crossFilter.treemapFeature = null;
    if (state.local.crossFilter.priceBucket === category) {
        state.local.crossFilter.priceBucket = null;
        state.local.crossFilter.priceBounds = null;
    } else {
        state.local.crossFilter.priceBucket = category;
        state.local.crossFilter.priceBounds = bounds;
    }
    renderAll();
}

function onTreemapCellClick(feature, ctrlKey) {
    const current = state.local.crossFilter.treemapFeature;
    if (!ctrlKey) {
        state.local.crossFilter.priceBucket = null;
        state.local.crossFilter.priceBounds = null;
    }
    if (current && current.l1 === feature.l1 && current.l2 === feature.l2 && current.l3 === feature.l3) {
        state.local.crossFilter.treemapFeature = null;
    } else {
        state.local.crossFilter.treemapFeature = feature;
    }
    renderAll();
}

function onMapBrush(bounds) {
    state.global.brushBounds = bounds;
    renderAll();
}

function onPriceByRoomClick(roomType) {
    resetCrossFilters();
    if (state.global.selectedRoomTypes.has(roomType) && state.global.selectedRoomTypes.size === 1) {
        state.global.selectedRoomTypes.clear();
    } else {
        state.global.selectedRoomTypes.clear();
        state.global.selectedRoomTypes.add(roomType);
    }
    syncDropdowns();
    renderAll();
}

function syncDropdowns() {
    const neighborhoodSelect = document.getElementById("neighborhoodSelect");
    if (state.global.selectedNeighborhoods.size === 0) {
        neighborhoodSelect.value = "All";
    } else if (state.global.selectedNeighborhoods.size === 1) {
        const selected = Array.from(state.global.selectedNeighborhoods)[0];
        neighborhoodSelect.value = Object.values(districtMap).includes(selected) ? selected : "All";
    } else {
        neighborhoodSelect.value = "All";
    }
    
    const roomTypeSelect = document.getElementById("roomTypeSelect");
    if (state.global.selectedRoomTypes.size === 0) roomTypeSelect.value = "All";
    else if (state.global.selectedRoomTypes.size === 1) roomTypeSelect.value = Array.from(state.global.selectedRoomTypes)[0];
    else roomTypeSelect.value = "All";
}

function setupEventListeners() {
    document.getElementById("neighborhoodSelect").addEventListener("change", e => {
        const value = e.target.value;
        state.global.selectedNeighborhoods.clear();
        if (value !== "All") state.global.selectedNeighborhoods.add(value);
        resetCrossFilters(); 
        renderAll();
    });

    document.getElementById("roomTypeSelect").addEventListener("change", e => {
        const value = e.target.value;
        state.global.selectedRoomTypes.clear();
        if (value !== "All") state.global.selectedRoomTypes.add(value);
        resetCrossFilters(); 
        renderAll();
    });

    document.getElementById("clearFilters").addEventListener("click", () => {
        // Reset Global filters
        state.global.selectedNeighborhoods.clear();
        state.global.selectedRoomTypes.clear();
        state.global.brushBounds = null;
        
        // Reset Cross filters 
        state.local.crossFilter.priceBucket = null;
        state.local.crossFilter.priceBounds = null;
        state.local.crossFilter.treemapFeature = null;
        
        // reset Crime Types
        state.global.selectedCrimeTypes.clear();
        const crimeTypeContainer = document.getElementById("crimeTypeFilters");
        if (crimeTypeContainer) {
            const crimeCheckboxes = crimeTypeContainer.querySelectorAll(".crime-type-toggle input");
            crimeCheckboxes.forEach(cb => {
                cb.checked = true;
                const type = cb.dataset.crimeType;
                state.global.selectedCrimeTypes.add(type);
            });
            
            const allCrimesCheckbox = crimeTypeContainer.querySelector(".all-crimes-toggle input");
            if (allCrimesCheckbox) {
                allCrimesCheckbox.checked = true;
            }
        }
        
        state.global.showAirbnb = true;
        const airbnbCheckbox = crimeTypeContainer?.querySelector(".airbnb-toggle input");
        if (airbnbCheckbox) {
            airbnbCheckbox.checked = true;
        }
        
        syncDropdowns();
        mapInstance?.clearBrush();
        mapInstance?.resetZoom();
        
        if (mapInstance) {
            const filteredAirbnb = applyFilters(globalData);
            mapInstance.setAirbnbVisibility(state.global.showAirbnb, filteredAirbnb);
            mapInstance.updateCrimePoints(globalData.crimeRaw, state.global.selectedCrimeTypes);
        }
        
        renderAll();
    });
}

function assignNeighborhoodToCrime(crimeData, geoData) {
    return crimeData.map(crime => {
        if (crime.neighbourhood_cleansed) return crime;
        const point = [crime.longitude, crime.latitude];
        for (const feature of geoData.features) {
            if (d3.geoContains(feature, point)) {
                return {
                    ...crime,
                    neighbourhood_cleansed: feature.properties.pri_neigh || feature.properties.neighborhood || feature.properties.name
                };
            }
        }
        return { ...crime, neighbourhood_cleansed: null };
    });
}

Promise.all([
    d3.csv("data/airbnb_data.csv", d => ({
        latitude: +d.latitude, longitude: +d.longitude,
        neighbourhood_cleansed: d.neighbourhood_cleansed,
        property_type: d.property_type, room_type: d.room_type,
        review_scores_rating: +d.review_scores_rating,
        accommodates: +d.accommodates, bedrooms: +d.bedrooms, beds: +d.beds,
        price: +d.price, rating_bucket: d.rating_bucket
    })),
    d3.csv("data/crime_aggregated.csv", d => ({
        neighbourhood_cleansed: d.neighbourhood_cleansed,
        crime_count: +d.crime_count
    })),
    d3.json("data/chicago_neighborhoods.geojson"),
    d3.csv("data/crime_filtered.csv", d => ({
        id: d.ID, latitude: +d.latitude, longitude: +d.longitude,
        primary_type: d["Primary Type"], description: d.Description,
        date: d.Date, neighbourhood_cleansed: d.neighbourhood_cleansed || null
    }))
]).then(([airbnb, crime, geo, crimeRaw]) => {
    const validCrimeRaw = crimeRaw.filter(d => d.latitude && d.longitude && !isNaN(d.latitude) && !isNaN(d.longitude));
    
    console.log("Performing spatial join for crime data...");
    const crimeWithNeighborhoods = assignNeighborhoodToCrime(validCrimeRaw, geo);
    console.log("Spatial join complete");
    
    const crimeTypes = Array.from(new Set(crimeWithNeighborhoods.map(d => d.primary_type))).filter(t => t).sort();
    
    globalData = { airbnb, crime, geo, crimeRaw: crimeWithNeighborhoods };

    populateDropdowns(airbnb, crimeTypes);
    setupEventListeners();

    mapInstance = createMap("#map", geo, airbnb, crimeWithNeighborhoods, onMapBrush, state.global.selectedCrimeTypes, state.global.showAirbnb, state.global.selectedNeighborhoods);
    renderAll();
    
    const mapContainer = document.querySelector("#map");
    const treemapContainer = document.querySelector("#treemap");
    
    if (mapContainer && treemapContainer) {
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(() => {
                console.log("Container resized, re-rendering...");
                renderAll();
            }, 200);
        });
        resizeObserver.observe(mapContainer);
        resizeObserver.observe(treemapContainer);
    }
}).catch(err => console.error("Error loading data:", err));
