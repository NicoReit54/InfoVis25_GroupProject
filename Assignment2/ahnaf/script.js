// Chart Configuration & Margins - for the axis
const margin = {top: 20, right: 30, bottom: 80, left: 80};
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// color coder: figma
const districtColors = {
  'Far North': '#BB4450',
  'Northwest': '#72297A',
  'North Side': '#0A3D38',
  'West Side': '#1FB8A8',
  'Central': '#157A70',
  'South Side': '#5CAD7C',
  'Southwest': '#97BF5A'
};

const districtMap = {
  // Far North
  'Rogers Park': 'Far North',
  'West Ridge': 'Far North',
  'Uptown': 'Far North',
  'Lincoln Square': 'Far North',
  'Edgewater': 'Far North',
  
  // Northwest
  'Edison Park': 'Northwest',
  'Norwood Park': 'Northwest',
  'Jefferson Park': 'Northwest',
  'Forest Glen': 'Northwest',
  'North Park': 'Northwest',
  'Albany Park': 'Northwest',
  'Portage Park': 'Northwest',
  'Irving Park': 'Northwest',
  'Dunning': 'Northwest',
  'Montclare': 'Northwest',
  'Belmont Cragin': 'Northwest',
  'Hermosa': 'Northwest',
  'Ohare': 'Northwest',
  "O'Hare": 'Northwest',
  
  // North Side
  'North Center': 'North Side',
  'Lake View': 'North Side',
  'Lincoln Park': 'North Side',
  'Avondale': 'North Side',
  'Logan Square': 'North Side',
  
  // West Side
  'Humboldt Park': 'West Side',
  'West Town': 'West Side',
  'Austin': 'West Side',
  'West Garfield Park': 'West Side',
  'East Garfield Park': 'West Side',
  'Near West Side': 'West Side',
  'North Lawndale': 'West Side',
  'South Lawndale': 'West Side',
  'Lower West Side': 'West Side',
  
  // Central
  'Near North Side': 'Central',
  'Loop': 'Central',
  'Near South Side': 'Central',
  'Armour Square': 'Central',
  'Douglas': 'Central',
  'Oakland': 'Central',
  'Fuller Park': 'Central',
  'Grand Boulevard': 'Central',
  'Kenwood': 'Central',
  'Washington Park': 'Central',
  'Hyde Park': 'Central',
  'Woodlawn': 'Central',
  
  // South Side
  'South Shore': 'South Side',
  'Chatham': 'South Side',
  'Avalon Park': 'South Side',
  'South Chicago': 'South Side',
  'Burnside': 'South Side',
  'Calumet Heights': 'South Side',
  'Roseland': 'South Side',
  'Pullman': 'South Side',
  'South Deering': 'South Side',
  'East Side': 'South Side',
  'West Pullman': 'South Side',
  'Riverdale': 'South Side',
  'Hegewisch': 'South Side',
  
  // Southwest
  'Garfield Ridge': 'Southwest',
  'Archer Heights': 'Southwest',
  'Brighton Park': 'Southwest',
  'Mckinley Park': 'Southwest',
  'Bridgeport': 'Southwest',
  'New City': 'Southwest',
  'West Elsdon': 'Southwest',
  'Gage Park': 'Southwest',
  'Clearing': 'Southwest',
  'West Lawn': 'Southwest',
  'Chicago Lawn': 'Southwest',
  'West Englewood': 'Southwest',
  'Englewood': 'Southwest',
  'Greater Grand Crossing': 'Southwest',
  'Ashburn': 'Southwest',
  'Auburn Gresham': 'Southwest',
  'Beverly': 'Southwest',
  'Washington Heights': 'Southwest',
  'Mount Greenwood': 'Southwest',
  'Morgan Park': 'Southwest'
};

// SVG Setup
const svg = d3.select("#chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

let allData = [];
let aggregatedData = [];
let currentDistrict = "all";
let currentRoomType = "all";

// Parse CSV row
function parseRow(d) {
  return {
    neighborhood: d.neighbourhood_cleansed,
    district: districtMap[d.neighbourhood_cleansed],
    room_type: d.room_type,
    crime_count: +d.crime_count,
    price: +d.price.replace(/[$,]/g, ''),
    reviews: +d.number_of_reviews,
    rating: +d.review_scores_rating
  };
}

// Aggregate data by neighborhood
function aggregateData() {
  const filtered = currentRoomType === "all" 
    ? allData 
    : allData.filter(d => d.room_type === currentRoomType);
  
  const grouped = d3.group(filtered, d => d.neighborhood);
  aggregatedData = Array.from(grouped, ([neighborhood, listings]) => ({
    neighborhood,
    district: listings[0].district,
    listingCount: listings.length,
    crimeCount: listings[0].crime_count,
    avgPrice: d3.mean(listings, d => d.price),
    avgRating: d3.mean(listings, d => d.rating)
  }));
}

// Populate dropdowns
function populateDropdowns() {
  const districts = [...new Set(allData.map(d => d.district))].sort();
  districts.forEach(d => {
    d3.select("#districtFilter").append("option").attr("value", d).text(d);
  });
  
  const roomTypes = [...new Set(allData.map(d => d.room_type))].sort();
  roomTypes.forEach(t => {
    d3.select("#roomType").append("option").attr("value", t).text(t);
  });
}

// Draw scatter plot
function updateVisualization() {
  const data = currentDistrict === "all" 
    ? aggregatedData 
    : aggregatedData.filter(d => d.district === currentDistrict);
  
  svg.selectAll("*").remove();
  
  const xMax = data.length ? d3.max(data, d => d.crimeCount) * 1.1 : 100;
  const yMax = data.length ? d3.max(data, d => d.listingCount) * 1.1 : 100;
  const x = d3.scaleLinear().domain([0, xMax]).range([0, width]).nice();
  const y = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();
  
  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y));
  
  // Axis labels
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text("Number of Crimes");
  
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -55)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Number of Listings");
  
  if (!data.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#999")
      .text("No Data");
    d3.select("#legend").html("");
    return;
  }
  
  // Scatter points
  svg.selectAll(".scatter-point")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "scatter-point")
    .attr("cx", d => x(d.crimeCount))
    .attr("cy", d => y(d.listingCount))
    .attr("r", 6)
    .attr("fill", d => districtColors[d.district])
    .attr("opacity", 0.7)
    .on("mouseover", function(e, d) {
      d3.select(this).attr("r", 9).attr("opacity", 1);
      tooltip.style("opacity", 1)
        .html(`<strong>${d.neighborhood}</strong><br>
               District: ${d.district}<br>
               # Listings: ${d.listingCount}<br>
               # Crimes: ${d.crimeCount.toLocaleString()}<br>
               Avg Price: $${d.avgPrice.toFixed(2)}`)
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("r", 6).attr("opacity", 0.7);
      tooltip.style("opacity", 0);
    });
  
  // Legend
  const legend = d3.select("#legend").html("");
  const visibleDistricts = [...new Set(data.map(d => d.district))].sort();
  visibleDistricts.forEach(district => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("span")
      .attr("class", "legend-color")
      .style("background-color", districtColors[district]);
    item.append("span").text(district);
  });
}

// Load data
d3.csv("gdf_listings.csv").then(raw => {
  console.log(raw);
  allData = raw.map(parseRow);
  aggregateData();
  populateDropdowns();
  updateVisualization();
  
  d3.select("#districtFilter").on("change", function() {
    currentDistrict = this.value;
    updateVisualization();
  });
  
  d3.select("#roomType").on("change", function() {
    currentRoomType = this.value;
    aggregateData();
    updateVisualization();
  });
});