function createHistogram(container, airbnbData, selectedNeighborhood, onBarClick, selectedPriceBucket) {
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const lowerLimit = 0;
  const upperLimit = 500;
  const binWidth = 50;

  // --- Tooltip (re-use) ---
  const tooltip = d3.select("body").select(".tooltip").empty()
    ? d3.select("body").append("div").attr("class", "tooltip")
    : d3.select("body").select(".tooltip");

  // --- Binning (wie bei dir) ---
  const bin = d3.bin()
    .domain([lowerLimit, upperLimit])
    .thresholds(d3.range(lowerLimit, upperLimit, binWidth));

  const pricesInRange = airbnbData.map(d => d.price).filter(p => p <= upperLimit);
  const bins = bin(pricesInRange);
  const overflowCount = airbnbData.filter(d => d.price > upperLimit).length;
  bins.push({ x0: upperLimit, x1: Infinity, length: overflowCount });

  // Kategorien sind stabil (fixe Bins)
  const categories = bins.map(d => {
    if (!isFinite(d.x1)) return `>${upperLimit} $`;
    if (d.x1 === upperLimit) return `${d.x0}-${d.x1} $`;
    return `${d.x0}-${d.x1 - 1} $`;
  });

  // --- Scales ---
  const x = d3.scaleBand()
    .domain(categories)
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length) || 0])
    .nice()
    .range([height, 0]);

  const maxTicks = 5;

  // --- Create SVG once, then update ---
  const root = d3.select(container);

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

    // Labels einmalig anlegen
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
      .text("Count");
  }

  const g = svgRoot.select("g.plot");
  const xAxisG = g.select("g.x-axis");
  const yAxisG = g.select("g.y-axis");
  const yGridG = g.select("g.y-grid");
  const barsG = g.select("g.bars");

  // Transition: beim ersten Render gerne sichtbar, später dezent
  const t = d3.transition().duration(500);

  // --- Axes ---
  xAxisG
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-25)")
    .style("text-anchor", "end")
    .attr("font-size", "9px");

  yAxisG
    .transition(t)
    .call(d3.axisLeft(y).ticks(maxTicks));

  // --- Gridlines (re-use: keine doppelten Linien) ---
  yGridG
    .transition(t)
    .call(
      d3.axisLeft(y)
        .ticks(maxTicks)
        .tickSize(-width)
        .tickFormat("")
    );

  // Grid "clean"
  yGridG.selectAll(".tick")
    .filter(d => d === 0)
    .select("line")
    .remove();

  yGridG.select(".domain").remove();

  // Bars vor Grid (damit Grid nicht durch Bars „durchscheint“)
  barsG.raise();

  // --- Titles update ---
  const title = selectedNeighborhood && selectedNeighborhood !== "All"
    ? `Price ($) - ${selectedNeighborhood}`
    : "Price ($) - All";

  g.select("text.x-title").text(title);

  // --- Bars: join(enter/update/exit); Enter animiert von 0, Update nur alt->neu ---
  const barSel = barsG.selectAll("rect.bar")
    .data(bins, d => d.x0); // stabiler Key pro Bin

  const enter = barSel.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d, i) => x(categories[i]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("cursor", "pointer");

  // enter animation nur beim erstmaligen Erscheinen
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

  // update: NICHT von 0 starten, sondern smooth von aktuellem Zustand zum neuen
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

  // exit (praktisch nie, weil gleiche bins), aber sauber
  barSel.exit()
    .transition(t)
      .attr("y", height)
      .attr("height", 0)
      .remove();

  // --- Events: auf Enter+Update binden (ohne Transition-Kette!) ---
  const mergedBars = barsG.selectAll("rect.bar");

  mergedBars
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "#2171b5");

      let label;
      if (!isFinite(d.x1)) label = `>${upperLimit} $`;
      else if (d.x1 === upperLimit) label = `${d.x0}-${d.x1} $`;
      else label = `${d.x0}-${d.x1 - 1} $`;

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

      if (onBarClick) onBarClick(cat, bounds);
    });
}

export { createHistogram };
