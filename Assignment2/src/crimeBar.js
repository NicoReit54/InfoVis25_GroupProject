// Crime by Neighborhood Bar Chart
function createCrimeBar(container, crimeData, airbnbData, selectedNeighborhoods, onBarClick) {
    const margin = { top: 20, right: 20, bottom: 60, left: 50 }; // REDUZIERT: von 100 auf 60
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

    // Aggregate crime counts by neighborhood
    const neighborhoodCounts = {};
    
    // Use crime data (already aggregated or from crimeRaw)
    if (crimeData && crimeData.length > 0) {
        crimeData.forEach(d => {
            if (d.neighbourhood_cleansed && d.crime_count !== undefined) {
                neighborhoodCounts[d.neighbourhood_cleansed] = d.crime_count;
            }
        });
    }

    // Convert to array and sort by crime count
    const data = Object.entries(neighborhoodCounts)
        .map(([neighborhood, count]) => ({ neighborhood, count: +count }))
        .filter(d => d.neighborhood && d.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 neighborhoods

    if (data.length === 0) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No Data");
        return;
    }

    const x = d3.scaleBand()
        .domain(data.map(d => d.neighborhood))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)]).nice()
        .range([height, 0]);

    // Color scale based on crime count
    const colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain([0, d3.max(data, d => d.count)]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)") // ANGEPASST: von -45 auf -35
        .style("text-anchor", "end")
        .attr("font-size", "8px")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em");

    svg.append("text")
        .attr("class", "x-title")
        .attr("x", width / 2)
        .attr("y", height + 60)   // <- weiter unten, damit es nicht mit ticks kollidiert
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text("Neighborhoods");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text("Crime Count");

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.neighborhood))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.count))
        .attr("height", d => height - y(d.count))
        .attr("fill", d => colorScale(d.count))
        .attr("opacity", d => selectedNeighborhoods.has(d.neighborhood) ? 1 : 0.7)
        .attr("stroke", d => selectedNeighborhoods.has(d.neighborhood) ? "#000" : "none")
        .attr("stroke-width", 2)
        .attr("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 1)
                .html(`<strong>${d.neighborhood}</strong><br>
                       Crimes: ${d.count}<br>
                       <em>${event.ctrlKey ? 'Ctrl+' : ''}Click to ${selectedNeighborhoods.has(d.neighborhood) ? 'deselect' : 'select'}</em>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
            const isSelected = selectedNeighborhoods.has(d.neighborhood);
            d3.select(this).attr("opacity", isSelected ? 1 : 0.7);
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (onBarClick) {
                onBarClick(d.neighborhood, event.ctrlKey);
            }
        });
}

export { createCrimeBar };
