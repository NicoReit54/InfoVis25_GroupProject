function createHistogram(container, airbnbData, selectedNeighborhood, onBarClick, selectedPriceBucket) {
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  if (!airbnbData || airbnbData.length === 0) {
    const sel = d3.select(container);
    sel.selectAll("*").remove(); 

    sel.append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .append("text")
      .attr("x", "50%")
      .attr("y", "50%")
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("font-size", "14px")
      .text("No Data");
    return; // WICHTIG: Hier aufhören!
  }

  const lowerLimit = 0;
  const upperLimit = 500;
  const binWidth = 50;

  //  Tooltip 
  const tooltip = d3.select("body").select(".tooltip").empty()
    ? d3.select("body").append("div").attr("class", "tooltip")
    : d3.select("body").select(".tooltip");

  //  Binning  
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

  //  Scales 
  const x = d3.scaleBand()
    .domain(categories)
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length) || 0])
    .nice()
    .range([height, 0]);

  const maxTicks = 5;

  //  SVG Setup  
  const root = d3.select(container);
  
  if (!root.select("text").empty() && root.select("g.plot").empty()) {
      root.selectAll("*").remove();
  }

  let svgRoot = root.select("svg.histogram");
  const isFirstRender = svgRoot.empty();

  if (isFirstRender) {
    svgRoot = root.append("svg")
      .attr("class", "histogram")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom])
      .attr("width", "100%")
      .attr("height", "100%");

    const g = svgRoot.append("g")
      .attr("class", "plot")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g").attr("class", "y-grid");
    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    g.append("g").attr("class", "y-axis");
    g.append("g").attr("class", "bars");

    g.append("text")
      .attr("class", "x-title")
      .attr("x", width / 2)
      .attr("y", height + 45)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px");

    g.append("text")
      .attr("class", "y-title")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .text("Listing Count");
  }

  const g = svgRoot.select("g.plot");
  const xAxisG = g.select("g.x-axis");
  const yAxisG = g.select("g.y-axis");
  const yGridG = g.select("g.y-grid");
  const barsG = g.select("g.bars");

  const t = d3.transition().duration(500);

  //  Axes 
  xAxisG
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end")
    .attr("font-size", "9px");

  yAxisG
    .transition(t)
    .call(d3.axisLeft(y).ticks(maxTicks));

  // Gridlines
  yGridG
    .transition(t)
    .call(
      d3.axisLeft(y)
        .ticks(maxTicks)
        .tickSize(-width)
        .tickFormat("")
    );

  yGridG.selectAll(".tick")
    .filter(d => d === 0)
    .select("line")
    .remove();

  yGridG.select(".domain").remove();
  
  // Bars on grid lines
  barsG.raise();

  // Title Update 
  const title = selectedNeighborhood && selectedNeighborhood !== "All" && selectedNeighborhood !== "Multiple"
    ? `Price ($) - ${selectedNeighborhood}`
    : selectedNeighborhood === "Multiple"
    ? "Price ($) - Multiple Neighborhoods"
    : "Price ($) - All";

  g.select("text.x-title").text(title);

  //  Bars (Enter/Update/Exit) 
  const barSel = barsG.selectAll("rect.bar")
    .data(bins, d => d.x0);

  // Enter
  const enter = barSel.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d, i) => x(categories[i]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("cursor", "pointer");

  enter
    .attr("fill", (d, i) => {
      const cat = categories[i];
      return (selectedPriceBucket && selectedPriceBucket === cat) ? "#2171b5" : "steelblue";
    })
    .attr("stroke", (d, i) => {
      const cat = categories[i];
      return (selectedPriceBucket && selectedPriceBucket === cat) ? "#000" : "none";
    })
    .attr("stroke-width", 2)
    .transition(t)
      .attr("y", d => y(d.length))
      .attr("height", d => height - y(d.length));

  // Update
  barSel
    .attr("fill", (d, i) => {
      const cat = categories[i];
      return (selectedPriceBucket && selectedPriceBucket === cat) ? "#2171b5" : "steelblue";
    })
    .attr("stroke", (d, i) => {
      const cat = categories[i];
      return (selectedPriceBucket && selectedPriceBucket === cat) ? "#000" : "none";
    })
    .attr("stroke-width", 2)
    .transition(t)
      .attr("x", (d, i) => x(categories[i]))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.length))
      .attr("height", d => height - y(d.length));

  // Exit
  barSel.exit()
    .transition(t)
      .attr("y", height)
      .attr("height", 0)
      .remove();

  //  Events 
  const mergedBars = barsG.selectAll("rect.bar");

  mergedBars
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "#2171b5");

      let label;
      if (!isFinite(d.x1)) label = `>${upperLimit} $`;
      else if (d.x1 === upperLimit) label = `${d.x0}-${d.x1} $`;
      else label = `${d.x0}-${d.x1 - 1} $`;

      tooltip.style("opacity", 1)
        .html(`${label}: ${d.length} listings<br><em>${event.ctrlKey ? 'Ctrl+' : ''}Click to filter treemap</em>`)
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

      if (onBarClick) onBarClick(cat, bounds, event.ctrlKey); 
    });
}

export { createHistogram };