import { createMap, crimeTypeColors } from "./map.js";
import { createScatter } from "./scatter.js";
import { createHistogram } from "./histogram_v2.js";
import { createTreemap } from "./treemap.js";
import { createCrimeBar } from "./crimeBar.js";
import { createPriceByRoom } from "./priceByRoom.js";

const state = {
    global: {
        neighborhood: "All",
        roomType: "All",
        brushBounds: null,
        selectedCrimeTypes: new Set(),
        showAirbnb: true
    },
    local: {
        treemap: {
            level1: "rating_bucket",
            level2: "room_type",
            level3: "property_type"
        },
        crossFilter: {
            priceBucket: null,
            priceBounds: null,
            treemapFeature: null
        }
    }
};

let globalData = {
    airbnb: [],
    crime: [],
    crimeRaw: [],
    geo: null
};

let mapInstance = null;

function populateDropdowns(airbnbData, crimeTypes) {
    const neighborhoodSelect = document.getElementById("neighborhoodSelect");
    neighborhoodSelect.innerHTML = "";
    
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All Neighborhoods";
    neighborhoodSelect.appendChild(allOption);

    const neighborhoods = Array.from(
        new Set(airbnbData.map(d => d.neighbourhood_cleansed).filter(d => d && d.trim() !== ""))
    ).sort();

    neighborhoods.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        neighborhoodSelect.appendChild(option);
    });

    const roomTypeSelect = document.getElementById("roomTypeSelect");
    roomTypeSelect.innerHTML = "";
    
    const allRoomOption = document.createElement("option");
    allRoomOption.value = "All";
    allRoomOption.textContent = "All Room Types";
    roomTypeSelect.appendChild(allRoomOption);

    const roomTypes = Array.from(
        new Set(airbnbData.map(d => d.room_type).filter(d => d && d.trim() !== ""))
    ).sort();

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
                if (e.target.checked) {
                    state.global.selectedCrimeTypes.add(type);
                } else {
                    state.global.selectedCrimeTypes.delete(type);
                }
            });
            if (mapInstance) {
                mapInstance.updateCrimePoints(globalData.crimeRaw, state.global.selectedCrimeTypes);
            }
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
                    if (e.target.checked) {
                        state.global.selectedCrimeTypes.add(type);
                    } else {
                        state.global.selectedCrimeTypes.delete(type);
                    }
                    if (mapInstance) {
                        mapInstance.updateCrimePoints(globalData.crimeRaw, state.global.selectedCrimeTypes);
                    }
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

    if (state.global.neighborhood !== "All") {
        filtered = filtered.filter(d => d.neighbourhood_cleansed === state.global.neighborhood);
    }

    if (state.global.roomType !== "All") {
        filtered = filtered.filter(d => d.room_type === state.global.roomType);
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

function applyHistogramFilter(data) {
    if (!state.local.crossFilter.treemapFeature) return data;
    
    const f = state.local.crossFilter.treemapFeature;
    return data.filter(d => 
        d[f.level1] === f.l1 && 
        d[f.level2] === f.l2 && 
        d[f.level3] === f.l3
    );
}

function applyTreemapFilter(data) {
    if (!state.local.crossFilter.priceBounds) return data;
    
    const b = state.local.crossFilter.priceBounds;
    return data.filter(d => d.price >= b.min && d.price < b.max);
}

function updateFilterStatus(filteredCount, totalCount) {
    const statusEl = document.getElementById("filterStatus");
    if (statusEl) {
        statusEl.textContent = `Showing ${filteredCount} of ${totalCount} listings`;
    }
}

function renderAll() {
    const filteredAirbnb = applyFilters(globalData);
    
    updateFilterStatus(filteredAirbnb.length, globalData.airbnb.length);

    if (mapInstance) {
        mapInstance.updatePoints(filteredAirbnb);
    }

    createScatter("#scatter", filteredAirbnb, globalData.crime, (neighborhood) => {
        state.global.neighborhood = neighborhood;
        document.getElementById("neighborhoodSelect").value = neighborhood;
        renderAll();
    });

    const histogramData = applyHistogramFilter(filteredAirbnb);
    createHistogram("#histogram", histogramData, state.global.neighborhood, onHistogramBarClick, state.local.crossFilter.priceBucket);

    const treemapData = applyTreemapFilter(filteredAirbnb);
    const { level1, level2, level3 } = state.local.treemap;
    createTreemap("#treemap", treemapData, level1, level2, level3, onTreemapCellClick, state.local.crossFilter.treemapFeature);

    // New visualizations
    createCrimeBar("#crimeBar", globalData.crime, filteredAirbnb, (neighborhood) => {
        state.global.neighborhood = neighborhood;
        document.getElementById("neighborhoodSelect").value = neighborhood;
        renderAll();
    });

    createPriceByRoom("#priceByRoom", filteredAirbnb, state.global.neighborhood);
}

function onHistogramBarClick(category, bounds) {
    if (state.local.crossFilter.priceBucket === category) {
        state.local.crossFilter.priceBucket = null;
        state.local.crossFilter.priceBounds = null;
    } else {
        state.local.crossFilter.priceBucket = category;
        state.local.crossFilter.priceBounds = bounds;
    }
    renderAll();
}

function onTreemapCellClick(feature) {
    const current = state.local.crossFilter.treemapFeature;
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

function setupEventListeners() {
    document.getElementById("neighborhoodSelect").addEventListener("change", e => {
        state.global.neighborhood = e.target.value;
        renderAll();
    });

    document.getElementById("roomTypeSelect").addEventListener("change", e => {
        state.global.roomType = e.target.value;
        renderAll();
    });

    document.getElementById("clearFilters").addEventListener("click", () => {
        state.global.neighborhood = "All";
        state.global.roomType = "All";
        state.global.brushBounds = null;
        state.local.crossFilter.priceBucket = null;
        state.local.crossFilter.priceBounds = null;
        state.local.crossFilter.treemapFeature = null;
        document.getElementById("neighborhoodSelect").value = "All";
        document.getElementById("roomTypeSelect").value = "All";
        mapInstance?.clearBrush();
        renderAll();
    });

    ["level1", "level2", "level3"].forEach(id => {
        document.getElementById(id).addEventListener("change", e => {
            state.local.treemap[id] = e.target.value;
            state.local.crossFilter.treemapFeature = null;
            renderAll();
        });
    });
}

Promise.all([
    d3.csv("data/airbnb_data.csv", d => ({
        latitude: +d.latitude,
        longitude: +d.longitude,
        neighbourhood_cleansed: d.neighbourhood_cleansed,
        property_type: d.property_type,
        room_type: d.room_type,
        review_scores_rating: +d.review_scores_rating,
        accommodates: +d.accommodates,
        bedrooms: +d.bedrooms,
        beds: +d.beds,
        price: +d.price,
        rating_bucket: d.rating_bucket
    })),
    d3.csv("data/crime_aggregated.csv", d => ({
        neighbourhood_cleansed: d.neighbourhood_cleansed,
        crime_count: +d.crime_count
    })),
    d3.json("data/chicago_neighborhoods.geojson"),
    d3.csv("data/crime_filtered.csv", d => ({
        id: d.ID,
        latitude: +d.latitude,
        longitude: +d.longitude,
        primary_type: d["Primary Type"],
        description: d.Description,
        date: d.Date
    }))
]).then(([airbnb, crime, geo, crimeRaw]) => {
    const validCrimeRaw = crimeRaw.filter(d => d.latitude && d.longitude && !isNaN(d.latitude) && !isNaN(d.longitude));
    const crimeTypes = Array.from(new Set(validCrimeRaw.map(d => d.primary_type))).filter(t => t).sort();
    
    globalData = { airbnb, crime, geo, crimeRaw: validCrimeRaw };

    populateDropdowns(airbnb, crimeTypes);
    setupEventListeners();

    mapInstance = createMap("#map", geo, airbnb, validCrimeRaw, onMapBrush, state.global.selectedCrimeTypes);
    renderAll();
}).catch(err => {
    console.error("Error loading data:", err);
});