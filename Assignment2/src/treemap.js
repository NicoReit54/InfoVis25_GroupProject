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
    const width = 800;
    const height = 400;
    const lineHeight = 15;

    const textPaddingX = 5;
    const approxCharWidth = 6;  // px per character at 9px font

    // helper function for map selection issue where the text might overflow the tiles
    function isNodeSelected(d) {
        if (!selectedFeature) return false;

        const l1 = d.parent?.parent?.data?.[0];
        const l2 = d.parent?.data?.[0];
        const l3 = d.data[0];

        return (
            l1 === selectedFeature.l1 &&
            l2 === selectedFeature.l2 &&
            l3 === selectedFeature.l3
        );
    }
    
    let svg = d3.select(container).select("svg");

    if (svg.empty()) {
        svg = d3.select(container)
            .append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("font-family", "sans-serif")
            .attr("font-size", "9px");
    }

    if (!airbnbData || airbnbData.length === 0) {
        svg.selectAll("*").remove();
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#999")
            .attr("font-size", "14px") 
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

    const nodeKey = d =>
        `${d.parent?.parent?.data?.[0]}-${d.parent?.data?.[0]}-${d.data[0]}`;

    const nodes = svg.selectAll("g.node")
        .data(root.leaves(), d =>
            `${d.parent?.parent?.data?.[0]}-${d.parent?.data?.[0]}-${d.data[0]}`
        );

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
        .attr("id", d => `treemap-clip-${nodeKey(d)}`)
        .append("rect")
        .attr("width", 0)
        .attr("height", 0);

    const nodesMerged = nodesEnter.merge(nodes);

    nodesMerged.transition(t)
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    nodesMerged.select("rect").transition(t)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", d => treemapColor(d.parent.parent.data[0]))
        .attr("fill-opacity", d => isNodeSelected(d) ? 1 : 0.5)
        .attr("stroke", d => isNodeSelected(d) ? "#000" : "none")
        .attr("stroke-width", 2);

    nodesMerged.select("clipPath").select("rect").transition(t)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0));

    nodesMerged.select("text").remove();

    const text = nodesMerged.append("text")
        .attr("clip-path", d => `url(#treemap-clip-${nodeKey(d)})`)
        .style("opacity", d => isNodeSelected(d) ? 1 : 0.3) 
        .style("pointer-events", "none")
        .style("display", d =>
            (d.x1 - d.x0 > 30 && d.y1 - d.y0 > 25) ? "block" : "none"
        );

    text.each(function (d) {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;

        const maxLines = Math.floor(h / lineHeight);
        const maxChars = Math.floor((w - 2 * textPaddingX) / approxCharWidth);

        if (maxLines <= 0 || maxChars <= 0) return;

        const truncate = str =>
            str.length > maxChars
                ? str.slice(0, Math.max(0, maxChars - 1)) + "…"
                : str;

        const lines = [
            { text: truncate(d.data[0]), bold: true },
            { text: truncate(`Units: ${d.data[1].count}`) },
            { text: truncate(`Beds: ${d3.format(".2")(d.data[1].avg_beds)}`) },
            { text: truncate(`Rating: ${d3.format(".2")(d.data[1].avg_rating)}`) },
            { text: truncate(d3.format("$.3s")(d.data[1].avg_price)) }
        ].slice(0, maxLines);

        d3.select(this)
            .selectAll("tspan")
            .data(lines)
            .enter()
            .append("tspan")
            .attr("x", textPaddingX)
            .attr("y", (_, i) => (i + 1) * lineHeight)
            .attr("font-weight", l => l.bold ? "bold" : null)
            .attr("fill-opacity", l => l.bold ? 1 : 0.7)
            .text(l => l.text);
    });

    text.transition(t).style("opacity", 1);

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
                       Avg Rating: ${stats.avg_rating?.toFixed(2) || 0}<br>
                       <em>${event.ctrlKey ? 'Ctrl+' : ''}Click to ${isNodeSelected(d) ? 'deselect' : 'select'}</em>`)
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
            }, event.ctrlKey);
        });

    nodes.exit()
        .transition(t)
        .style("opacity", 0)
        .remove();
}

export { createTreemap, buildHierarchyTree };