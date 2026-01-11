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

    d3.select(container).selectAll("*").remove();

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

    const svg = d3.select(container)
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("font-family", "sans-serif")
        .attr("font-size", "9px");

    const tooltip = d3.select("body").select(".tooltip").empty()
        ? d3.select("body").append("div").attr("class", "tooltip")
        : d3.select("body").select(".tooltip");

    const root = buildHierarchyTree(airbnbData, level1, level2, level3);

    d3.treemap()
        .tile(d3.treemapSquarify)
        .size([width, height])
        .padding(1)
        (root);

    const node = svg.selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .attr("cursor", "pointer");

    node.append("rect")
        .attr("fill", d => {
            if (d.parent && d.parent.parent && d.parent.parent.data) {
                return treemapColor(d.parent.parent.data[0]);
            }
            return "#ccc";
        })
        .attr("fill-opacity", d => {
            if (selectedFeature) {
                const l1 = d.parent?.parent?.data?.[0] || "";
                const l2 = d.parent?.data?.[0] || "";
                const l3 = d.data[0] || "";
                if (l1 === selectedFeature.l1 && l2 === selectedFeature.l2 && l3 === selectedFeature.l3) {
                    return 1;
                }
                return 0.3;
            }
            return 0.6;
        })
        .attr("stroke", d => {
            if (selectedFeature) {
                const l1 = d.parent?.parent?.data?.[0] || "";
                const l2 = d.parent?.data?.[0] || "";
                const l3 = d.data[0] || "";
                if (l1 === selectedFeature.l1 && l2 === selectedFeature.l2 && l3 === selectedFeature.l3) {
                    return "#000";
                }
            }
            return "none";
        })
        .attr("stroke-width", 2)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0));

    node.on("mouseover", function(event, d) {
            const l1 = d.parent?.parent?.data?.[0] || "";
            const l2 = d.parent?.data?.[0] || "";
            const l3 = d.data[0] || "";
            const stats = d.data[1];
            tooltip.style("opacity", 1)
                .html(`<strong>${l1} > ${l2} > ${l3}</strong><br>
                       Count: ${stats.count}<br>
                       Avg Price: $${stats.avg_price?.toFixed(0) || 0}<br>
                       Avg Rating: ${stats.avg_rating?.toFixed(2) || 0}<br>
                       <em>Click to filter histogram</em>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            const l1 = d.parent?.parent?.data?.[0] || "";
            const l2 = d.parent?.data?.[0] || "";
            const l3 = d.data[0] || "";
            if (onCellClick) {
                onCellClick({ l1, l2, l3, level1, level2, level3 });
            }
        });

    node.append("clipPath")
        .attr("id", (d, i) => `treemap-clip-${i}`)
        .append("rect")
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0));

    node.filter(d => (d.x1 - d.x0) > 30 && (d.y1 - d.y0) > 25)
        .append("text")
        .attr("clip-path", (d, i) => `url(#treemap-clip-${i})`)
        .selectAll("tspan")
        .data(d => {
            const name = d.data[0] || "";
            const count = d.data[1]?.count || 0;
            return [name.substring(0, 15), `(${count})`];
        })
        .enter()
        .append("tspan")
        .attr("x", 3)
        .attr("y", (d, i) => 12 + i * 10)
        .text(d => d);

    // ========================================
    // UPDATE MODE (update with transition())
    // It basically takes what is there and then 
    // transitions into what is added
    // ========================================

    // set transition variable
    const t = d3.transition()
        .duration(500) // 0.5 sec
        .ease(d3.easeSin); 
    
    node.transition(t)
        .attr("transform", d => `translate(${d.x0}, ${d.y0})`);
    
    node.select("rect").transition(t)
        .attr("fill", d => treemapColor(d.parent.parent.data[0]))
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);
    
    // tooltips
    node.select("title").transition(t)
        .text(d => `L1: ${d.parent.parent.data[0]} // L2: ${d.parent.data[0]} // L3: ${d.data[0]}
        \nNumber of Units: ${d.data[1].count}
        \nAvg Price: ${d3.format(".2f")(d.data[1].avg_price)}
        \nAvg Rating: ${d3.format(".2f")(d.data[1].avg_rating)}
        \nAvg Bedrooms: ${d3.format(".2")(d.data[1].avg_bedrooms)}
        \nAvg Beds: ${d3.format(".2")(d.data[1].avg_beds)}`);

    // recalculate the clipPath thingy
    node.select("clipPath")
        .attr("id", (d, i) => `clip-${i}`);

    node.select("clipPath rect").transition(t)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    // Remove old text to add it afterwards (we do not need to morph like with the tiles, doesnt make sense for text)
    node.select("text").remove();


    // Append fresh text with fade-in transition
    node.append("text")
        .attr("clip-path", (d, i) => `url(#clip-${i})`)
        // for this style attribute I asked CoPilot for input on how to manage this
        .style("display", d => (d.x1 - d.x0 < 20 || d.y1 - d.y0 < 20) ? "none" : "block")
        .style("opacity", 0) // start invisible
        .html(d => `
        <tspan x=5 y=15 font-weight="bold">${d.data[0]}</tspan>
        <tspan x=5 y=30 fill-opacity=0.7> Units: ${d.data[1].count}</tspan>
        <tspan x=5 y=45 fill-opacity=0.7> Beds: ${d3.format(".3")(d.data[1].avg_beds)}</tspan>
        <tspan x=5 y=60 fill-opacity=0.7> Rating: ${d3.format(".3")(d.data[1].avg_rating)}</tspan>
        <tspan x=5 y=75 fill-opacity=0.7>${d3.format("$.3s")(d.data[1].avg_price)}</tspan>
        `)
        // apply transition to full opacity
        .transition(t)
        .style("opacity", 1); 

    // ========================================
    // EXIT
    // Delete what is not anymore here
    // ========================================
    node.exit().transition(t)
        .style("opacity", 0)
        .remove();
    
}

export { createTreemap, buildHierarchyTree };