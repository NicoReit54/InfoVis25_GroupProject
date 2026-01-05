// IMPORTS
import {buildHierarchyTree, plotTreeMap } from "./treemap.js";


// ======================================================
// Define variables/states
// ======================================================

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


// ======================================================
// SVG Setup
// ======================================================

// treemap svg setup
const width = 600; 
const height = 400; 

const svg_treemap = d3.select("#treemap")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("font-family", "sans-serif")
    .attr("font-size", "10px");


function populateNeighborhoodDropdown(airbnbData) {
    const select = document.getElementById("neighborhoodSelect");

    // clear existing options (important if re-called)
    select.innerHTML = "";

    // Add "All" option at the top
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All Neighborhoods";
    select.appendChild(allOption);

    // Extract unique neighborhood names
    const neighborhoods = Array.from(
    new Set(
        airbnbData
        .map(d => d.neighborhood_cleansed)
        .filter(d => d && d.trim() !== "")
    )
    ).sort();
    console.log(neighborhoods)
    // Populate dropdown
    neighborhoods.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
  });
}


// ======================================================
// Global filters
// ======================================================

function applyGlobalFilters(data) { 
    if (state.global.neighborhood === "All") { 
        return data; 
    } 
    console.log("filter mode")
    console.log(data.airbnb)
    return { 
        airbnb: data.airbnb.filter(
            d => d.neighborhood_cleansed === state.global.neighborhood)
    /*, 
    crime: data.crime.filter(d => d3.geoContains(neighborhoodFeature, [d.longitude, d.latitude]) 
    ), 
    geo: { ...data.geo, features: [neighborhoodFeature] } */
    }; 
}

// ======================================================
// RENDER FUNCTIONS
// ======================================================

// Treemap
function renderTreemap(airbnbData) { 
    const { level1, level2, level3 } = state.local.treemap; 
    const root = buildHierarchyTree(airbnbData, level1, level2, level3); 
    plotTreeMap(root, width, height, svg_treemap); 
}
/*
// Crimemap
function renderCrimeMap(crimeData) {

;
}

// Histogram
function renderHistogram(airbnbData) {

;
}

// Scatterplot
function renderScatter(airbnbData) {

;
}
*/

// ======================================================
// CENTRAL RENDER FUNCTION
// ======================================================

function renderAll() { 
    // get the filtered data!
    const filtered = applyGlobalFilters(globalData); 
    console.log("hi")
    console.log(filtered);
    // Render the plots
    renderTreemap(filtered.airbnb); 
    //renderCrimeMap(filtered.crime, filtered.geo); // placeholder 
    //renderHistogram(filtered.airbnb); // placeholder
    //renderScatter(filtered.airbnb, filtered.crime); // placeholder 
}

// ======================================================
// EVENT LISTENERS
// ======================================================

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
                state.local.treemap[id] = e.target.value; 
                renderAll(); 
            }); 
        }); 
    }

// ======================================================
// DATA LOAD and RENDER call
// ======================================================


// Promise.all([...]): Loads multiple files in parallel. Waits until all are finished and only then runs .then(...)
Promise.all([
    d3.csv("data/airbnb_data.csv", d => ({
        // We have to adapt the data types as all are strings!
        // + in front of the loaded row (here d) means "convert to number"
        latitude: +d.latitude,
        longitude: +d.longitude,
        neighborhood_cleansed: d.neighbourhood_cleansed,
        property_type: d.property_type,
        room_type: d.room_type,
        review_scores_rating: +d.review_scores_rating,
        accommodates: +d.accommodates,
        bedrooms: +d.bedrooms,
        beds: +d.beds,
        price: +d.price,
        rating_bucket: d.rating_bucket
    }))
    //,
/*  d3.csv("crime.csv", d => ({
       latitude: +d.latitude,
        longitude: +d.longitude,
        primary_type: d.primary_type
    })),
    d3.json("neighborhoods.geojson")*/
]).then(([airbnb]) => {//, crime, geo]) => {
    globalData = { airbnb };//, crime, geo };
    console.log(airbnb)
    populateNeighborhoodDropdown(airbnb); 
    //console.log(neighborhoods)
    setupEventListeners();
    renderAll();
});