const districtColors = {
    'Far North': '#BB4450',
    'Northwest': '#72297A',
    'North Side': '#0A3D38',
    'West Side': '#1FB8A8',
    'Central': '#157A70',
    'South Side': '#5CAD7C',
    'Southwest': '#97BF5A'
};

const crimeTypeColors = {
    'HOMICIDE': '#d62728',
    'ASSAULT': '#ff7f0e',
    'BATTERY': '#e377c2',
    'ROBBERY': '#9467bd',
    'BURGLARY': '#8c564b',
    'THEFT': '#17becf',
    'MOTOR VEHICLE THEFT': '#bcbd22',
    'CRIMINAL DAMAGE': '#7f7f7f',
    'NARCOTICS': '#2ca02c',
    'WEAPONS VIOLATION': '#d62728',
    'CRIMINAL TRESPASS': '#aec7e8',
    'OTHER OFFENSE': '#98df8a',
    'DECEPTIVE PRACTICE': '#ff9896',
    'OTHER': '#1f77b4'
};

const districtMap = {
    'Rogers Park': 'Far North', 'West Ridge': 'Far North', 'Uptown': 'Far North', 'Lincoln Square': 'Far North', 'Edgewater': 'Far North', 'Andersonville': 'Far North',
    'Albany Park': 'Northwest', 'Belmont Cragin': 'Northwest', 'Dunning': 'Northwest', 'Forest Glen': 'Northwest', 'Sauganash,Forest Glen': 'Northwest', 'Hermosa': 'Northwest',
    'Irving Park': 'Northwest', 'Jefferson Park': 'Northwest', 'Montclare': 'Northwest', 'North Park': 'Northwest', 'Norwood Park': 'Northwest', 'O\'Hare': 'Northwest',
    'Portage Park': 'Northwest', 'Edison Park': 'Northwest', 'Galewood': 'Northwest', 'North Center': 'North Side', 'Lake View': 'North Side', 'Lincoln Park': 'North Side',
    'Avondale': 'North Side', 'Logan Square': 'North Side', 'Bucktown': 'North Side', 'Boystown': 'North Side', 'Wrigleyville': 'North Side', 'Sheffield & DePaul': 'North Side',
    'Humboldt Park': 'West Side', 'West Town': 'West Side', 'Austin': 'West Side', 'Garfield Park': 'West Side', 'North Lawndale': 'West Side', 'Little Village': 'West Side',
    'Lower West Side': 'West Side', 'Near West Side': 'West Side', 'West Loop': 'West Side', 'Greektown': 'West Side', 'United Center': 'West Side', 'Little Italy,UIC': 'West Side',
    'Ukrainian Village': 'West Side', 'East Village': 'West Side', 'Wicker Park': 'West Side', 'Near North Side': 'Central', 'Loop': 'Central', 'Near South Side': 'Central',
    'Armour Square': 'Central', 'Chinatown': 'Central', 'Douglas': 'Central', 'Oakland': 'Central', 'Fuller Park': 'Central', 'Grand Boulevard': 'Central', 'Kenwood': 'Central',
    'Washington Park': 'Central', 'Hyde Park': 'Central', 'Woodlawn': 'Central', 'Gold Coast': 'Central', 'River North': 'Central', 'Streeterville': 'Central',
    'Magnificent Mile': 'Central', 'Old Town': 'Central', 'Rush & Division': 'Central', 'Grant Park': 'Central', 'Printers Row': 'Central', 'South Shore': 'South Side',
    'Chatham': 'South Side', 'Avalon Park': 'South Side', 'South Chicago': 'South Side', 'Burnside': 'South Side', 'Calumet Heights': 'South Side', 'Roseland': 'South Side',
    'Pullman': 'South Side', 'South Deering': 'South Side', 'East Side': 'South Side', 'West Pullman': 'South Side', 'Hegewisch': 'South Side', 'Garfield Ridge': 'Southwest',
    'Archer Heights': 'Southwest', 'Brighton Park': 'Southwest', 'Mckinley Park': 'Southwest', 'Bridgeport': 'Southwest', 'New City': 'Southwest', 'West Elsdon': 'Southwest',
    'Gage Park': 'Southwest', 'Clearing': 'Southwest', 'West Lawn': 'Southwest', 'Chicago Lawn': 'Southwest', 'Englewood': 'Southwest', 'Grand Crossing': 'Southwest',
    'Ashburn': 'Southwest', 'Auburn Gresham': 'Southwest', 'Beverly': 'Southwest', 'Washington Heights': 'Southwest', 'Mount Greenwood': 'Southwest', 'Morgan Park': 'Southwest'
};

function getNeighborhoodName(properties) {
    return properties.pri_neigh || properties.neighborhood || properties.name || properties.community || null;
}

function createMap(container, geoData, airbnbData, crimeData, onBrushEnd, selectedCrimeTypes, showAirbnb = true) {
    const width = 1110;
    const height = 1110;
    
    let svg = d3.select(container).select("svg");
    if (svg.empty()) {
        svg = d3.select(container)
            .append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("preserveAspectRatio", "xMidYMid meet");
    }
    // only render when its not there
    let g = svg.select("g.map-layer");
    if (g.empty()) {
        g = svg.append("g").attr("class", "map-layer");
    }
    
    let airbnbVisible = showAirbnb;
    let currentTransform = d3.zoomIdentity;

    const projection = d3.geoMercator().fitSize([width, height], geoData);
    const path = d3.geoPath().projection(projection);

    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .on("zoom", (event) => {
            currentTransform = event.transform;
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    let neighborhoods = g.select("g.neighborhoods");
    if (neighborhoods.empty()) {
        neighborhoods = g.append("g").attr("class", "neighborhoods");
    }

    if (neighborhoods.selectAll("path").empty()) {
        neighborhoods.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#eee")
            .attr("fill-opacity", 0.3)
            .attr("stroke", "#ccc")
            .attr("stroke-width", 0.5);
    }

    let crimeGroup = g.select("g.crimes");
    if (crimeGroup.empty()) {
        crimeGroup = g.append("g").attr("class", "crimes");
    }

    let pointsGroup = g.select("g.points");
    if (pointsGroup.empty()) {
        pointsGroup = g.append("g").attr("class", "points");
    }

    const tooltip = d3.select("body").select(".tooltip").empty()
        ? d3.select("body").append("div").attr("class", "tooltip")
        : d3.select("body").select(".tooltip");

    function updateCrimePoints(crimes, selectedTypes) {
        const filteredCrimes = selectedTypes && selectedTypes.size > 0
            ? crimes.filter(d => selectedTypes.has(d.primary_type))
            : [];

        const markers = crimeGroup.selectAll("g.crime-marker")
            .data(filteredCrimes, d => d.id);
        
        markers.exit().remove();
        
        const enter = markers.enter()
            .append("g")
            .attr("class", "crime-marker")
            .attr("transform", d => {
                const coords = projection([d.longitude, d.latitude]);
                return coords ? `translate(${coords[0]},${coords[1]})` : "translate(0,0)";
            });
        // Draw X shape using two crossed lines
        const size = 5;
        enter.append("line")
            .attr("x1", -size).attr("y1", -size)
            .attr("x2", size).attr("y2", size)
            .attr("stroke", d => crimeTypeColors[d.primary_type] || crimeTypeColors['OTHER'])
            .attr("stroke-width", 3.5)
            .attr("opacity", 0.8);
        enter.append("line")
            .attr("x1", size).attr("y1", -size)
            .attr("x2", -size).attr("y2", size)
            .attr("stroke", d => crimeTypeColors[d.primary_type] || crimeTypeColors['OTHER'])
            .attr("stroke-width", 3.5)
            .attr("opacity", 0.8);
        
        enter.on("mouseover", function(event, d) {
                d3.select(this).selectAll("line")
                    .attr("stroke-width", 2.5)
                    .attr("opacity", 1);
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.primary_type}</strong><br>${d.description}<br>${d.date}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).selectAll("line")
                    .attr("stroke-width", 4)
                    .attr("opacity", 0.8);
                tooltip.style("opacity", 0);
            });
    }

    function updatePoints(data) {
        if (!airbnbVisible) {
            pointsGroup.selectAll("circle").remove();
            return;
        }
        const points = pointsGroup.selectAll("circle")
            .data(data, d => d.latitude + "_" + d.longitude);
        
        points.exit().remove();
        
        points.enter()
            .append("circle")
            .attr("cx", d => projection([d.longitude, d.latitude])[0])
            .attr("cy", d => projection([d.longitude, d.latitude])[1])
            .attr("r", 4)
            .attr("fill", "#1976d2")
            .attr("opacity", 0.6)
            .append("title")
            .text(d => `${d.neighbourhood_cleansed}\nPrice: $${d.price}\nRating: ${d.review_scores_rating}`);
    }
    
    function setAirbnbVisibility(visible, data) {
        airbnbVisible = visible;
        updatePoints(data);
    }

    function updateNeighborhoodHighlight(selectedNeighborhoods) {
        neighborhoods.selectAll("path")
            .attr("fill", d => {
                const name = getNeighborhoodName(d.properties);
                return selectedNeighborhoods.has(name) ? "#ffd700" : "#eee";
            })
            .attr("fill-opacity", d => {
                const name = getNeighborhoodName(d.properties);
                return selectedNeighborhoods.has(name) ? 0.5 : 0.3;
            })
            .attr("stroke", d => {
                const name = getNeighborhoodName(d.properties);
                return selectedNeighborhoods.has(name) ? "#ff8c00" : "#ccc";
            })
            .attr("stroke-width", d => {
                const name = getNeighborhoodName(d.properties);
                return selectedNeighborhoods.has(name) ? 2 : 0.5;
            });
    }

    updatePoints(airbnbData);
    if (crimeData && crimeData.length > 0) {
        updateCrimePoints(crimeData, selectedCrimeTypes);
    }

    function brushed(event) {
        if (!event.selection) {
            onBrushEnd(null);
            return;
        }

        const [[x0, y0], [x1, y1]] = event.selection;
        
        const invTransform = currentTransform.invert.bind(currentTransform);
        const [tx0, ty0] = invTransform([x0, y0]);
        const [tx1, ty1] = invTransform([x1, y1]);
        
        const bounds = {
            minLng: projection.invert([tx0, ty0])[0],
            maxLng: projection.invert([tx1, ty0])[0],
            minLat: projection.invert([tx0, ty1])[1],
            maxLat: projection.invert([tx0, ty0])[1]
        };
        onBrushEnd(bounds);
    }

    const brush = d3.brush()
        .extent([[0, 0], [width, height]])
        .on("start", () => {
            svg.on(".zoom", null);
        })
        .on("brush", () => {})  // intentionally empty: no work here so it is faster
        .on("end", (event) => {
            brushed(event);
            svg.call(zoom); 
        });

    const brushGroup = svg.select(".brush").empty()
        ? svg.append("g").attr("class", "brush")
        : svg.select(".brush");
    
    brushGroup
        .style("pointer-events", "all")
        .style("cursor", "crosshair")
        .call(brush);

    function resetZoom() {
        svg.transition()
            .duration(500)
            .call(zoom.transform, d3.zoomIdentity);
        currentTransform = d3.zoomIdentity;
    }

    return { 
        updatePoints, 
        updateCrimePoints, 
        setAirbnbVisibility, 
        updateNeighborhoodHighlight,
        clearBrush: () => brushGroup.call(brush.move, null),
        resetZoom
    };
}

export { createMap, districtMap, districtColors, crimeTypeColors };