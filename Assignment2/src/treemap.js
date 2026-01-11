const treemapColor = d3.scaleOrdinal([
    "#771155", "#114477", "#44AA77", "#DDAA77", "#AA4488", "#CC99BB", "#4477AA",
    "#77AADD", "#117777", "#44AAAA", "#77CCCC", "#117744", "#88CCAA", "#777711",
    "#AAAA44", "#DDDD77", "#774411", "#AA7744", "#771122", "#AA4455", "#DD7788"
]);

function buildHierarchyTree(data, level1, level2, level3) {
    const group = d3.rollup(
        data,
        v => ({
            avg_price: d3.mean(v, d => d.price),
            avg_rating: d3.mean(v, d => d.review_scores_rating),
            avg_accommodates: d3.mean(v, d => d.accommodates),
            avg_bedrooms: d3.mean(v, d => d.bedrooms),
            avg_beds: d3.mean(v, d => d.beds),
            count: v.length
        }),
        d => d[level1],
        d => d[level2],
        d => d[level3]
    );

    return d3.hierarchy(group, ([key, value]) =>
        value instanceof Map ? Array.from(value) : null
    )
    .sum(([key, value]) => value.count)
    .sort((a, b) => d3.descending(a.value, b.value));
}
function createTreemap(container, airbnbData, level1, level2, level3, onCellClick, selectedFeature) {
    const width = 400;
    const height = 300;

    let svg = d3.select(container).select("svg");

    if (svg.empty()) {
        svg = d3.select(container)
            .append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("font-family", "sans-serif")
            .attr("font-size", "9px");
    }

    if (!airbnbData || airbnbData.length === 0) {
        d3.select(container)
            .append("svg")
            .attr("viewBox", [0, 0, width, height])
            .append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .text("No Data");
        return;
    }

    const tooltip = d3.select("body").select(".tooltip").empty()
        ? d3.select("body").append("div").attr("class", "tooltip")
        : d3.select("body").select(".tooltip");

    const root = buildHierarchyTree(airbnbData, level1, level2, level3);

    d3.treemap()
        .tile(d3.treemapSquarify)
        .size([width, height])
        .padding(1)(root);

    const t = d3.transition()
        .duration(500)
        .ease(d3.easeSin);

    // ============================
    // DATA JOIN (KEYED)
    // ============================
    const nodes = svg.selectAll("g.node")
        .data(root.leaves(), d =>
            `${d.parent?.parent?.data?.[0]}-${d.parent?.data?.[0]}-${d.data[0]}`
        );

    // ============================
    // ENTER
    // ============================
    const nodesEnter = nodes.enter()
        .append("g")
        .attr("class", "node")
        .attr("cursor", "pointer")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodesEnter.append("rect")
        .attr("width", 0)
        .attr("height", 0)
        .attr("fill", d => treemapColor(d.parent.parent.data[0]))
        .attr("fill-opacity", 0.6);

    nodesEnter.append("clipPath")
        .attr("id", (d, i) => `treemap-clip-${i}`)
        .append("rect")
        .attr("width", 0)
        .attr("height", 0);

    // ============================
    // MERGE
    // ============================
    const nodesMerged = nodesEnter.merge(nodes);

    // ============================
    // UPDATE + TRANSITIONS
    // ============================
    nodesMerged.transition(t)
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodesMerged.select("rect").transition(t)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", d => treemapColor(d.parent.parent.data[0]))
        .attr("fill-opacity", d => {
            if (!selectedFeature) return 0.6;
            const l1 = d.parent?.parent?.data?.[0];
            const l2 = d.parent?.data?.[0];
            const l3 = d.data[0];
            return (l1 === selectedFeature.l1 && l2 === selectedFeature.l2 && l3 === selectedFeature.l3) ? 1 : 0.3;
        })
        .attr("stroke", d => {
            if (!selectedFeature) return "none";
            const l1 = d.parent?.parent?.data?.[0];
            const l2 = d.parent?.data?.[0];
            const l3 = d.data[0];
            return (l1 === selectedFeature.l1 && l2 === selectedFeature.l2 && l3 === selectedFeature.l3) ? "#000" : "none";
        })
        .attr("stroke-width", 2);

    nodesMerged.select("clipPath rect").transition(t)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0));

    // ============================
    // TEXT (REBUILD WITH FADE)
    // ============================
    nodesMerged.select("text").remove();

    const text = nodesMerged.append("text")
        .attr("clip-path", (d, i) => `url(#treemap-clip-${i})`)
        .style("opacity", 0)
        .style("display", d =>
            (d.x1 - d.x0 > 30 && d.y1 - d.y0 > 25) ? "block" : "none"
        );

    text.html(d => `
        <tspan x="5" y="15" font-weight="bold">${d.data[0]}</tspan>
        <tspan x="5" y="30" fill-opacity="0.7">Units: ${d.data[1].count}</tspan>
        <tspan x="5" y="45" fill-opacity="0.7">Beds: ${d3.format(".2")(d.data[1].avg_beds)}</tspan>
        <tspan x="5" y="60" fill-opacity="0.7">Rating: ${d3.format(".2")(d.data[1].avg_rating)}</tspan>
        <tspan x="5" y="75" fill-opacity="0.7">${d3.format("$.3s")(d.data[1].avg_price)}</tspan>
    `);

    text.transition(t).style("opacity", 1);

    // ============================
    // INTERACTIONS (UNCHANGED)
    // ============================
    nodesMerged
        .on("mouseover", function (event, d) {
            const l1 = d.parent?.parent?.data?.[0] || "";
            const l2 = d.parent?.data?.[0] || "";
            const l3 = d.data[0] || "";
            const stats = d.data[1];

            tooltip.style("opacity", 1)
                .html(`<strong>${l1} > ${l2} > ${l3}</strong><br>
                       Count: ${stats.count}<br>
                       Avg Price: $${stats.avg_price?.toFixed(0) || 0}<br>
                       Avg Rating: ${stats.avg_rating?.toFixed(2) || 0}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .on("click", function (event, d) {
            if (!onCellClick) return;
            onCellClick({
                l1: d.parent?.parent?.data?.[0],
                l2: d.parent?.data?.[0],
                l3: d.data[0],
                level1, level2, level3
            });
        });

    // ============================
    // EXIT
    // ============================
    nodes.exit()
        .transition(t)
        .style("opacity", 0)
        .remove();
}

export { createTreemap, buildHierarchyTree };