// Average Price by Room Type Bar Chart
function createPriceByRoom(container, airbnbData, selectedNeighborhood) {
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
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

    if (!airbnbData || airbnbData.length === 0) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No Data");
        return;
    }

    // Aggregate by room type
    const roomStats = d3.rollup(
        airbnbData,
        v => ({
            avgPrice: d3.mean(v, d => d.price),
            avgRating: d3.mean(v, d => d.review_scores_rating),
            count: v.length,
            medianPrice: d3.median(v, d => d.price)
        }),
        d => d.room_type
    );

    const data = Array.from(roomStats, ([roomType, stats]) => ({
        roomType,
        avgPrice: stats.avgPrice,
        avgRating: stats.avgRating,
        count: stats.count,
        medianPrice: stats.medianPrice
    })).filter(d => d.roomType && d.avgPrice > 0)
      .sort((a, b) => b.avgPrice - a.avgPrice);

    if (data.length === 0) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No Data");
        return;
    }

    // Color scale for room types
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.roomType))
        .range(["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f"]);

    const x = d3.scaleBand()
        .domain(data.map(d => d.roomType))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avgPrice) * 1.1]).nice()
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-20)")
        .style("text-anchor", "end")
        .attr("font-size", "9px");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d}`));

    const title = selectedNeighborhood && selectedNeighborhood !== "All"
        ? `Avg Price - ${selectedNeighborhood}`
        : "Avg Price by Room Type";

    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text(title);

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text("Average Price ($)");

    // Bars
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.roomType))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.avgPrice))
        .attr("height", d => height - y(d.avgPrice))
        .attr("fill", d => colorScale(d.roomType))
        .attr("rx", 3)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.8);
            tooltip.style("opacity", 1)
                .html(`<strong>${d.roomType}</strong><br>
                       Avg Price: $${d.avgPrice.toFixed(0)}<br>
                       Median: $${d.medianPrice.toFixed(0)}<br>
                       Listings: ${d.count}<br>
                       Avg Rating: ${d.avgRating?.toFixed(2) || 'N/A'}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        });

    // Add value labels on bars
    svg.selectAll(".value-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", d => x(d.roomType) + x.bandwidth() / 2)
        .attr("y", d => y(d.avgPrice) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("fill", "#333")
        .text(d => `$${d.avgPrice.toFixed(0)}`);
}

export { createPriceByRoom };
