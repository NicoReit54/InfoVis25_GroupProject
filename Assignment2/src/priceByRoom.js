// Price Distribution Boxplot by Room Type
function createPriceByRoom(container, airbnbData, selectedNeighborhood, onBoxClick, selectedRoomType) {
    const margin = { top: 10, right: 20, bottom: 60, left: 60 };
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

    // Aggregate by room type with boxplot statistics
    const roomStats = d3.rollup(
        airbnbData,
        v => {
            const prices = v.map(d => d.price).sort(d3.ascending);
            const q1 = d3.quantile(prices, 0.25);
            const median = d3.quantile(prices, 0.5);
            const q3 = d3.quantile(prices, 0.75);
            const iqr = q3 - q1;
            const min = d3.min(prices);
            const max = d3.max(prices);
            
            // Whiskers: 1.5 * IQR
            const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
            const upperWhisker = Math.min(max, q3 + 1.5 * iqr);
            
            return {
                q1,
                median,
                q3,
                min,
                max,
                lowerWhisker,
                upperWhisker,
                avgPrice: d3.mean(prices),
                count: v.length
            };
        },
        d => d.room_type
    );

    const data = Array.from(roomStats, ([roomType, stats]) => ({
        roomType,
        ...stats
    })).filter(d => d.roomType)
      .sort((a, b) => a.roomType.localeCompare(b.roomType));

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
        .padding(0.4);

    // Y-axis based on actual whiskers, not outliers
    const maxWhisker = d3.max(data, d => d.upperWhisker);
    const y = d3.scaleLinear()
        .domain([0, maxWhisker * 1.1]).nice()
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-30)")
        .style("text-anchor", "end")
        .attr("font-size", "9px")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d}`));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text("Price ($)");

    const boxWidth = x.bandwidth();

    // Draw boxplots
    const boxGroups = svg.selectAll(".box-group")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "box-group")
        .attr("transform", d => `translate(${x(d.roomType)},0)`);

    // Vertical lines (whiskers) - clip to visible range
    boxGroups.append("line")
        .attr("x1", boxWidth / 2)
        .attr("x2", boxWidth / 2)
        .attr("y1", d => Math.max(y(d.lowerWhisker), 0))
        .attr("y2", d => y(d.q1))
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);

    boxGroups.append("line")
        .attr("x1", boxWidth / 2)
        .attr("x2", boxWidth / 2)
        .attr("y1", d => y(d.q3))
        .attr("y2", d => Math.min(y(d.upperWhisker), height))
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);

    // Lower whisker cap
    boxGroups.append("line")
        .attr("x1", boxWidth * 0.3)
        .attr("x2", boxWidth * 0.7)
        .attr("y1", d => Math.max(y(d.lowerWhisker), 0))
        .attr("y2", d => Math.max(y(d.lowerWhisker), 0))
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);

    // Upper whisker cap
    boxGroups.append("line")
        .attr("x1", boxWidth * 0.3)
        .attr("x2", boxWidth * 0.7)
        .attr("y1", d => Math.min(y(d.upperWhisker), height))
        .attr("y2", d => Math.min(y(d.upperWhisker), height))
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);

    // Box (Q1 to Q3)
    boxGroups.append("rect")
        .attr("x", boxWidth * 0.15)
        .attr("width", boxWidth * 0.7)
        .attr("y", d => y(d.q3))
        .attr("height", d => y(d.q1) - y(d.q3))
        .attr("fill", d => colorScale(d.roomType))
        .attr("fill-opacity", d => selectedRoomType === d.roomType ? 1 : 0.7)
        .attr("stroke", d => selectedRoomType === d.roomType ? "#000" : "#333")
        .attr("stroke-width", d => selectedRoomType === d.roomType ? 2.5 : 1.5)
        .attr("rx", 2)
        .attr("cursor", "pointer")
        .on("mouseover", function(event, d) {
            if (selectedRoomType !== d.roomType) {
                d3.select(this).attr("fill-opacity", 0.9);
            }
            tooltip.style("opacity", 1)
                .html(`<strong>${d.roomType}</strong><br>
                       Median: ${d.median.toFixed(0)}<br>
                       Average: ${d.avgPrice.toFixed(0)}<br>
                       Min: ${d.min.toFixed(0)}<br>
                       Max: ${d.max.toFixed(0)}<br>
                       Listings: ${d.count}<br>
                       <em>Click to ${selectedRoomType === d.roomType ? 'deselect' : 'filter'}</em>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
            if (selectedRoomType !== d.roomType) {
                d3.select(this).attr("fill-opacity", 0.7);
            }
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (onBoxClick) {
                onBoxClick(d.roomType);
            }
        });

    // Median line
    boxGroups.append("line")
        .attr("x1", boxWidth * 0.15)
        .attr("x2", boxWidth * 0.85)
        .attr("y1", d => y(d.median))
        .attr("y2", d => y(d.median))
        .attr("stroke", "#333")
        .attr("stroke-width", 2.5);
}

export { createPriceByRoom };