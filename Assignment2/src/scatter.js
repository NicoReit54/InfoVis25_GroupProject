import { districtMap, districtColors } from './map.js';

function createScatter(container, airbnbData, crimeData, onPointClick) {
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
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

    svg.selectAll(".scatter-point")
        .data(aggregatedData)
        .enter()
        .append("circle")
        .attr("class", "scatter-point")
        .attr("cx", d => x(d.crimeCount))
        .attr("cy", d => y(d.listingCount))
        .attr("r", 3)
        .attr("fill", d => districtColors[d.district] || "#666")
        .attr("opacity", 0.7)
        .attr("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 5).attr("opacity", 1);
            tooltip.style("opacity", 1)
                .html(`<strong>${d.neighborhood}</strong><br>
                       District: ${d.district}<br>
                       Listings: ${d.listingCount}<br>
                       Crimes: ${d.crimeCount}<br>
                       Avg Price: $${d.avgPrice.toFixed(0)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 3).attr("opacity", 0.7);
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (onPointClick) onPointClick(d.neighborhood);
        });
}

export { createScatter };
