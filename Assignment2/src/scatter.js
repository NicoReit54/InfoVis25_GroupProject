import { districtMap, districtColors } from './map.js';

function createScatter(container, airbnbData, crimeData, selectedNeighborhoods, onPointClick) {
    const margin = { top: 20, right: 80, bottom: 50, left: 60 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    d3.select(container).selectAll("*").remove();

    const svg = d3.select(container)
        .append("svg")
        .attr("viewBox", [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom])
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body").select(".tooltip").empty() 
        ? d3.select("body").append("div").attr("class", "tooltip")
        : d3.select("body").select(".tooltip");

    const grouped = d3.group(airbnbData, d => d.neighbourhood_cleansed);
    const aggregatedData = Array.from(grouped, ([neighborhood, listings]) => {
        const crimeCount = crimeData.find(c => c.neighbourhood_cleansed === neighborhood)?.crime_count || 0;
        return {
            neighborhood,
            district: districtMap[neighborhood] || 'Unknown',
            listingCount: listings.length,
            crimeCount: +crimeCount,
            avgPrice: d3.mean(listings, d => d.price),
            avgRating: d3.mean(listings, d => d.review_scores_rating)
        };
    }).filter(d => d.listingCount > 0);

    if (aggregatedData.length === 0) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No Data");
        return;
    }

    const xMax = d3.max(aggregatedData, d => d.crimeCount) * 1.1 || 100;
    const yMax = d3.max(aggregatedData, d => d.listingCount) * 1.1 || 100;

    const x = d3.scaleLinear().domain([0, xMax]).range([0, width]).nice();
    const y = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text("Crime Count");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text("Listing Count");

    const districtsInData = Array.from(new Set(aggregatedData.map(d => d.district)))
        .sort((a, b) => a.localeCompare(b));

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 10}, 0)`); 

    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", "11px")
        .attr("font-weight", 600)
        .text("District");

    const legendItem = legend.selectAll("g.legend-item")
        .data(districtsInData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${12 + i * 14})`);

    legendItem.append("circle")
        .attr("cx", 6)
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", d => districtColors[d] || "#666");

    legendItem.append("text")
        .attr("x", 14)
        .attr("y", 3)
        .attr("font-size", "10px")
        .text(d => d);

    svg.selectAll(".scatter-point")
        .data(aggregatedData)
        .enter()
        .append("circle")
        .attr("class", "scatter-point")
        .attr("cx", d => x(d.crimeCount))
        .attr("cy", d => y(d.listingCount))
        .attr("r", d => selectedNeighborhoods.has(d.neighborhood) ? 5 : 3) 
        .attr("fill", d => districtColors[d.district] || "#666")
        .attr("opacity", d => selectedNeighborhoods.has(d.neighborhood) ? 1 : 0.7) 
        .attr("stroke", d => selectedNeighborhoods.has(d.neighborhood) ? "#000" : "none") 
        .attr("stroke-width", 2)
        .attr("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 5).attr("opacity", 1);
            tooltip.style("opacity", 1)
                .html(`<strong>${d.neighborhood}</strong><br>
                       District: ${d.district}<br>
                       Listings: ${d.listingCount}<br>
                       Crimes: ${d.crimeCount}<br>
                       Avg Price: $${d.avgPrice.toFixed(0)}<br>
                       <em>${event.ctrlKey ? 'Ctrl+' : ''}Click to ${selectedNeighborhoods.has(d.neighborhood) ? 'deselect' : 'select'}</em>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
            const isSelected = selectedNeighborhoods.has(d.neighborhood);
            d3.select(this).attr("r", isSelected ? 5 : 3).attr("opacity", isSelected ? 1 : 0.7);
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (onPointClick) onPointClick(d.neighborhood, event.ctrlKey); 
        });
}

export { createScatter };