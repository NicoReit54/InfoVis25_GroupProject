// IMPORTS
import {buildHierarchyTree, plotTreeMap, updateTreemap } from "./treemap.js";



// Store the states of the global/local filters
// For me: Objects in JS are like dictionaries / maps: E.g. state.global.neighborhood means go into state, then global and then retrieve the value of the neighborhood
const state = {
    global: {
        neighborhood: "All"
    },
    local: {
        treemap: {
            level1: "rating_bucket",
            level2: "room_type",
            level3: "property_type"
        }
    }
};

// make globalData flexible as we dont have the data yet and need to assign it still
let globalData;

const width = 600; 
const height = 400; 
const svg = d3.select("#treemap")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("font-family", "sans-serif")
    .attr("font-size", "10px");




function populateNeighborhoodDropdown(geojson) {
    const select = document.getElementById("neighborhoodSelect");
    geojson.features
    .map(f => f.properties.neighborhood)
    .sort()
    .forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
});
}





// Promise.all([...]): Loads multiple files in parallel. Waits until all are finished and only then runs .then(...)
Promise.all([
    d3.csv("airbnb.csv", d => ({
        // We have to adapt the data types as all are strings!
        // + in front of the loaded row (here d) means "convert to number"
        latitude: +d.latitude,
        longitude: +d.longitude,
        property_type: d.property_type,
        room_type: d.room_type,
        review_scores_rating: +d.review_scores_rating,
        accommodates: +d.accommodates,
        bedrooms: +d.bedrooms,
        beds: +d.beds,
        price: +d.price,
        rating_bucket: d.rating_bucket
    })),
/*  d3.csv("crime.csv", d => ({
       latitude: +d.latitude,
        longitude: +d.longitude,
        primary_type: d.primary_type
    })),
    d3.json("neighborhoods.geojson")*/
]).then(([airbnb]) => {//, crime, geo]) => {
    globalData = { airbnb };//, crime, geo };
    //populateNeighborhoodDropdown(geo);
    renderAll();
});

// for applying the global filtering
function applyGlobalFilters(data) { 
    if (state.global.neighborhood === "All") { 
        return data; 
    } 
    const neighborhoodFeature = data.geo.features.find( 
        f => f.properties.neighborhood === state.global.neighborhood 
    ); 
    return { 
        airbnb: data.airbnb.filter(d => d3.geoContains(neighborhoodFeature, [d.longitude, d.latitude]) 
    )
    /*, 
    crime: data.crime.filter(d => d3.geoContains(neighborhoodFeature, [d.longitude, d.latitude]) 
    ), 
    geo: { ...data.geo, features: [neighborhoodFeature] } */
}; 
}

// Central render function
function renderAll() { 
    const filtered = applyGlobalFilters(globalData); 
    renderTreemap(filtered.airbnb); 
    //renderCrimeMap(filtered.crime, filtered.geo); // placeholder 
    //renderHistogram(filtered.airbnb); // placeholder
    //renderScatter(filtered.airbnb, filtered.crime); // placeholder 
}

function setupEventListeners() { 
    // Global neighborhood dropdown 
    document
        .getElementById("neighborhoodSelect")
        .addEventListener("change", e => { 
            state.global.neighborhood = e.target.value; 
            renderAll(); }); 
        // Treemap local controls 
        ["level1", "level2", "level3"].forEach(id => { 
            document.getElementById(id).addEventListener("change", e => {
                state.local.treemap[id] = e.target.value; renderAll(); 
            }); 
        }); 
    }