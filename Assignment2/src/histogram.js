function createHistogram(container, airbnbData, selectedNeighborhood, onBarClick, selectedPriceBucket) {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
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

    const lowerLimit = 0;
    const upperLimit = 500;
    const binWidth = 50;

    const bin = d3.bin()
        .domain([lowerLimit, upperLimit])
        .thresholds(d3.range(lowerLimit, upperLimit, binWidth));

    const pricesInRange = airbnbData.map(d => d.price).filter(p => p <= upperLimit);
    const bins = bin(pricesInRange);
    const overflowCount = airbnbData.filter(d => d.price > upperLimit).length;
    bins.push({ x0: upperLimit, x1: Infinity, length: overflowCount });

    const categories = bins.map(d => {
        if (!isFinite(d.x1)) return `>${upperLimit} $`;
        if (d.x1 === upperLimit) return `${d.x0}-${d.x1} $`;
        return `${d.x0}-${d.x1 - 1} $`;
    });

    const x = d3.scaleBand()
        .domain(categories)
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)]).nice()
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end")
        .attr("font-size", "9px");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

    // --- Gridlines (Y) ---
    const maxTicks = 5; // du nutzt sowieso .ticks(5) für die y-Achse

    const yGridG = svg.append("g")
    .attr("class", "y-grid");

    yGridG.call(
    d3.axisLeft(y)
        .ticks(maxTicks)
        .tickSize(-width)     // <- wichtig: Grid über gesamte Plotbreite
        .tickFormat("")       // <- keine Labels im Grid
    );

    // optional: Grid "cleaner" machen (wie bei dir)
    yGridG.selectAll(".tick")
    .filter(d => d === 0)
    .select("line")
    .remove();

    yGridG.select(".domain").remove();


    const title = selectedNeighborhood && selectedNeighborhood !== "All" 
        ? `Price ($) - ${selectedNeighborhood}` 
        : "Price ($) - All";

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text(title);

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text("Count");

    svg.selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d, i) => x(categories[i]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.length))
        .attr("height", d => height - y(d.length))
        .attr("fill", (d, i) => {
            const cat = categories[i];
            if (selectedPriceBucket && selectedPriceBucket === cat) {
                return "#2171b5";
            }
            return "steelblue";
        })
        .attr("stroke", (d, i) => {
            const cat = categories[i];
            if (selectedPriceBucket && selectedPriceBucket === cat) {
                return "#000";
            }
            return "none";
        })
        .attr("stroke-width", 2)
        .attr("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#2171b5");
            const label = !isFinite(d.x1) ? `>${upperLimit} $` : `${d.x0}-${d.x1 - 1} $`;
            tooltip.style("opacity", 1)
                .html(`${label}: ${d.length} listings<br><em>Click to filter treemap</em>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
            const i = bins.indexOf(d);
            const cat = categories[i];
            if (!selectedPriceBucket || selectedPriceBucket !== cat) {
                d3.select(this).attr("fill", "steelblue");
            }
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            const i = bins.indexOf(d);
            const cat = categories[i];
            const bounds = { min: d.x0, max: isFinite(d.x1) ? d.x1 : Infinity };
            if (onBarClick) {
                onBarClick(cat, bounds);
            }
        });
}

export { createHistogram };
