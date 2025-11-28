// COMMENTS
// d3-force module is for networks! Basically when we do not know the absolute points of the data in the room
// but rather the relative connection between them


// TODO: Inspect whether we need the following:
// Set 21-color scheme https://www.r-bloggers.com/2013/02/the-paul-tol-21-color-salute/
const color = d3.scaleOrdinal([
  "#771155", "#AA4488", "#CC99BB", "#114477", "#4477AA", "#77AADD", "#117777", 
  "#44AAAA", "#77CCCC", "#117744", "#44AA77", "#88CCAA", "#777711", "#AAAA44", 
  "#DDDD77", "#774411", "#AA7744", "#DDAA77", "#771122", "#AA4455", "#DD7788"])

// TODO: Adapt for our data 
d3.json("./data.json").then(graph => {
  const {nodes, links} = graph;

  // I have already implemented the color legend.
  createColorLegend(nodes);

  // and tree map.
  plotTreeMap(nodes);
});

const createColorLegend = function(nodes) {
  // d3.nest() creates a "nest" operator used to group an array of data
  // into keyed buckets. It's a builder pattern: you configure how to
  // group (key), optionally how to reduce each group (rollup), and then
  // execute the grouping (entries / map / object).
  let sections = d3.nest()
    // .key(...) defines the grouping key function. For each element `d`
    // in `nodes`, this function returns the key used to group it.
    // Here, all items with the same value of d['Section ID'] will be
    // placed in the same group.
    .key(d => d['Section ID'])
    // .rollup(...) defines a function that reduces each group's array
    // of values to a single value. Without rollup, each group's `value`
    // would be the array of items in that group.
    //
    // rollup(d => d[0]['Section']) receives the array of items in a
    // group (we named it `d` here) and returns the 'Section' field
    // from the first item in that array. Effectively this maps:
    //   groupKey -> sectionName
    //
    // Note: this assumes every item in a group has the same 'Section'
    // value and that the group is non-empty.
    .rollup(d => d[0]['Section'])
  // .entries(nodes) actually runs the nest on the `nodes` array and
  // returns an array of objects like:
  //   [{ key: "section-id-1", value: "Section Name 1" },
  //    { key: "section-id-2", value: "Section Name 2" },
  //    ...]
  // If rollup were omitted, `value` would be the array of grouped items.
  .entries(nodes);

  sections = sections.sort((a, b) => d3.ascending(+a.key, +b.key))

  // here we select the legend
  const legend = d3.select("#legend")
    .style("font-family", "sans-serif")
    .style("font-size", "10px");

  // here we select the div of the legend and join it with the data
  legend.selectAll("div")
    .data(sections)
    .join("div")
      .attr('class', 'swatches-item')
      .html(d => `<div class="swatches-swatch" style="background: ${color(+d.key - 1)};"></div>
        <div class="swatches-label">${d.value}</div>`);
}

// TODO: Adapt for our purpose
const plotTreeMap = function(nodes) {
  const width = 1500, height = 800;

  const svg = d3.select("#treemap")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("font-family", "sans-serif")
    .attr("font-size", "10px");

  // 1. Transform the node data to hierarcical format 
  // >> Really important for the d3TreeMap to recognize how to put the layout!!
  // Ref: https://d3js.org/d3-array/group and https://observablehq.com/@d3/d3-group
  const group = d3.group(
    nodes, // data
    d => d['Section ID'], // first group
    d => d["HS2 ID"] // second group 
   );

  // 2. Create the hierarchical layout with d3.hierarchy
  // Ref: https://d3js.org/d3-hierarchy/hierarchy
  const root = d3.hierarchy(group)
    .sum(d => d["Trade Value"]) // will be the value visible in the console.log of root
    .sort((a, b) => d3.descending(a.value, b.value));

  console.log(root)
  
  // 3. Compute the treemap layout
  // Ref: https://d3js.org/d3-hierarchy/treemap
  d3.treemap()
   .tile(d3.treemapSquarify)
   .size([width, height])
   .padding(1)
   (root); // calling it here with root >> that when root existds the d3 treemap is executed
  

  // 4. Add leave nodes to the SVG element
  const node = svg.selectAll("a") // TODO look up <a> element in HTML, has something to do with hyperlinks
   .data(root.leaves())
   .join("a")
    .attr("transform", d => `translate(${d.x0}, ${d.y0})`);
  
  node.append("rect")
   .attr("fill", d => color(d["data"]["Section ID"] - 1))
   .attr("fill-opacity", 0.5)
   .attr("width", d => d.x1 - d.x0)
   .attr("height", d => d.y1 - d.y0);

  // 5. Add the tooltip to each node
  //node.append("title").text(d => `${d.data.HS4}\n${d3.format("$,")(d.value)}`);

  // 6. Add text to each node
  node.append("clipPath")
        .attr("id", (d, i) => `clip-${i}`)
      .append("rect")
       .attr("width", d => d.x1 - d.x0)
       .attr("height", d => d.y1 - d.y0)

  node.append("text")
        // adding a clip-path cuts everything that is below in the html structure so the text does not go over the square!!
        // inspect the text to see exactly, but its just above the actual text value so it makes sense!
       .attr("clip-path", (d, i) => `url(#clip-${i})`) 
       .html(d => d.value >= 500000000 ? `<tspan x=5 y=15 font-weight="bold">${d.data.HS4}</tspan>
                   <tspan x=5 y=30 fill-opacity=0.7>${d3.format("$.3s")(d.value)}</tspan>` : ``)
}
