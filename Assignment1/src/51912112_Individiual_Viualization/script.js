// Set 21-color scheme as in tutorial because why not https://www.r-bloggers.com/2013/02/the-paul-tol-21-color-salute/
const color = d3.scaleOrdinal([
  "#771155", "#114477", "#44AA77", "#DDAA77", "#AA4488", "#CC99BB",  "#4477AA", "#77AADD", "#117777", 
  "#44AAAA", "#77CCCC", "#117744",  "#88CCAA", "#777711", "#AAAA44", 
  "#DDDD77", "#774411", "#AA7744", "#771122", "#AA4455", "#DD7788"])

function buildHierarchy(data, level1, level2, level3) {
  // This buildHierarchiy was originally a whole block which I pulled out of original plotTreeMap 
  // function to make it dynamic (i.e. call it more than once)

  // 1. Transform the node data to hierarcical format 
  // >> Really important for the d3TreeMap to recognize how to put the layout!!
  // Ref: https://d3js.org/d3-array/group and https://observablehq.com/@d3/d3-group
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
    // user choice for levels
    d => d[level1],   
    d => d[level2],
    d => d[level3]
  );

  // 2. Create the hierarchical layout with d3.hierarchy
  // Ref: https://d3js.org/d3-hierarchy/hierarchy
  // According to docu above (copy&paste)
  // If data is a Map, it is implicitly converted to the entry [undefined, data], and the children accessor instead defaults to:
  // function children(d) {
  //  return Array.isArray(d) ? d[1] : null;
  //}
  // This allows us to pass the result of group or rollup to hierarchy
  // So it checks whether the child is another array and expands it in the case 
  return d3.hierarchy(group, ([key, value]) =>
    value instanceof Map ? Array.from(value) : null
  )
  .sum(([key, value]) => value.count)
  .sort((a, b) => d3.descending(a.value, b.value));
}

const plotTreeMap = function(root) {
  console.log(root) // This format I do not entirely get but I also did not during the tutorial

  // 3. Compute the treemap layout
  // Ref: https://d3js.org/d3-hierarchy/treemap
  d3.treemap()
   .tile(d3.treemapSquarify)
   .size([width, height])
   .padding(2)
   (root); // calling it here with root >> that when root existds the d3 treemap is executed
  
  console.log(root.leaves()[0]);

  // 4. Add leave nodes to the SVG element
  // This is basically the JOIN step from the Tutorial as we add the data to the svg (be it that there was none before)
  
  // ========================================
  // JOIN (the (potentially) old and new)
  // ========================================
  const node = svg.selectAll("g") // TODO: Look up <a> element in HTML, has something to do with hyperlinks acc. to Tutorial
   .data(root.leaves(), d => d.data[0]);
  
  // ========================================
  // ENTER MODE (create the "new" nodes)
  // ========================================
  const nodeEnter = node.enter().append("g")
    .attr("transform", d => `translate(${d.x0}, ${d.y0})`);
  
  console.log(nodeEnter);
  
  nodeEnter.append("rect")
   .attr("fill", d => color(d.parent.parent.data[0]))
   .attr("fill-opacity", 0.5)
   .attr("width", d => d.x1 - d.x0)
   .attr("height", d => d.y1 - d.y0);

  console.log(nodeEnter);

  // enter/append the tooltip 
  nodeEnter.append("title")
    .text(d => `L1: ${d.parent.parent.data[0]} // L2: ${d.parent.data[0]} // L3: ${d.data[0]}
      \nNumber of Units: ${d.data[1].count}
      \nAvg Price: ${d3.format(".2f")(d.data[1].avg_price)}
      \nAvg Rating: ${d3.format(".2f")(d.data[1].avg_rating)}
      \nAvg Bedrooms: ${d3.format(".2")(d.data[1].avg_bedrooms)}
      \nAvg Beds: ${d3.format(".2")(d.data[1].avg_beds)}`);

  nodeEnter.append("clipPath")
      .attr("id", (d, i) => `clip-${i}`)
    .append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0);
  
  nodeEnter.append("text")
    .attr("clip-path", (d, i) => `url(#clip-${i})`)
    .style("display", d => (d.x1 - d.x0 < 20 || d.y1 - d.y0 < 20) ? "none" : "block")
    .html(d => `
      <tspan x=5 y=15 font-weight="bold">${d.data[0]}</tspan>
      <tspan x=5 y=30 fill-opacity=0.7> Units: ${d.data[1].count}</tspan>
      <tspan x=5 y=45 fill-opacity=0.7> Beds: ${d3.format(".3")(d.data[1].avg_beds)}</tspan>
      <tspan x=5 y=60 fill-opacity=0.7> Rating: ${d3.format(".3")(d.data[1].avg_rating)}</tspan>
      <tspan x=5 y=75 fill-opacity=0.7>${d3.format("$.3s")(d.data[1].avg_price)}</tspan>
    `);
    
  // ========================================
  // UPDATE MODE (update with transition())
  // ========================================

  // set transition variable
  const t = d3.transition()
    .duration(500) // 0.5 sec
    .ease(d3.easeSin); 
  
  node.transition(t)
    .attr("transform", d => `translate(${d.x0}, ${d.y0})`);
  
  node.select("rect").transition(t)
    .attr("fill", d => color(d.parent.parent.data[0]))
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

  // Remove old text
  node.select("text").remove();

  // Append fresh text with fade-in (we do not need to morph like with the tiles, doesnt make sense for text)
  node.append("text")
    .attr("clip-path", (d, i) => `url(#clip-${i})`)
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
  // ========================================
  node.exit().transition(t)
    .style("opacity", 0)
    .remove();
  }


// create the SVG once here (previously it was in the plotTreeMap function #BigLearning)
// We do this in order to have the transitions work. If we create the svg each time 
// we call the function, ofc there is no transition..
const width = 1500, height = 800;
const svg = d3.select("#treemap")
  .append("svg")
  .attr("viewBox", [0, 0, width, height])
  .attr("width", width)
  .attr("height", height)
  .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
  .attr("font-family", "sans-serif")
  .attr("font-size", "10px");

// ========================================
// LOAD THE DATA and pass it to the functions
// ========================================
let globalData; // declare it here so we can reuse later after "initial render"


d3.csv("vis_data.csv", d => ({
  // We have to adapt the data types as all are strings!
  // + in front of the loaded row (here d) means "convert to number"
  latitude: +d.latitude,
  longitude: +d.longitude,
  property_type: d.property_type,
  room_type: d.room_type,
  review_scores_rating: +d.review_scores_rating,
  accommodates: +d.accommodates,
  bedrooms: +d.bedrooms,
  beds: +d.beds,
  price: +d.price,
  rating_bucket: d.rating_bucket
})).then(data => {
  globalData = data;
  console.log(data[0]);
  console.log(data);
  // okay nice, super simple layout! (
  // basically each row like 
  // {latitude: '41.89634', longitude: '-87.65608', property_type: 'Entire rental unit', room_type: 'Entire home/apt', review_scores_rating: '4.9', …})

  // Initial render
  let root = buildHierarchy(data, "rating_bucket", "room_type", "property_type",);
  plotTreeMap(root);
});

// update the trrempa based on the levels choosen by the user!
function updateTreemap() {
  const level1 = document.getElementById("level1").value;
  const level2 = document.getElementById("level2").value;
  const level3 = document.getElementById("level3").value;
  console.log(level1, level2, level3);
  const root = buildHierarchy(globalData, level1, level2, level3);
  console.log(root)
  plotTreeMap(root);
}
// Listen for dropdown changes
["level1","level2","level3"].forEach(id => {
  document.getElementById(id).addEventListener("change", updateTreemap);
});

