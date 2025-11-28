// COMMENTS
// d3-force module is for networks! Basically when we do not know the absolute points of the data in the room
// but rather the relative connection between them


// TODO: Inspect whether we need the following:
// Set 21-color scheme https://www.r-bloggers.com/2013/02/the-paul-tol-21-color-salute/
const color = d3.scaleOrdinal([
  "#771155", "#114477", "#44AA77", "#DDAA77", "#AA4488", "#CC99BB",  "#4477AA", "#77AADD", "#117777", 
  "#44AAAA", "#77CCCC", "#117744",  "#88CCAA", "#777711", "#AAAA44", 
  "#DDDD77", "#774411", "#AA7744", "#771122", "#AA4455", "#DD7788"])

// We have to adapt the data types as all are strings!
d3.csv("vis_data.csv", d => ({
  // + in front of the loaded row (here d) means "convert to number"
  latitude: +d.latitude,
  longitude: +d.longitude,
  property_type: d.property_type,
  room_type: d.room_type,
  review_scores_rating: +d.review_scores_rating,
  accommodates: +d.accommodates,
  bedrooms: +d.bedrooms,
  beds: +d.beds,
  price: +d.price
})).then(data => {
  console.log(data[0]);
  console.log(data);
  // okay nice, super simple layout! (
  // basically each row like 
  // {latitude: '41.89634', longitude: '-87.65608', property_type: 'Entire rental unit', room_type: 'Entire home/apt', review_scores_rating: '4.9', …})

  // I have already implemented the color legend.
  //createColorLegend(data);

  // and tree map.
  plotTreeMap(data);
});


const createColorLegend = function(data) {
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
  .entries(data);

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
const plotTreeMap = function(data) {
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

  const group = d3.rollup(
    data,
    v => ({
      avg_price: d3.mean(v, d => d.price),
      avg_rating: d3.mean(v, d => d.review_scores_rating)
    }),
    d => d.room_type, // first group
    d => d.property_type // second level
  );

  console.log(group)

  // 2. Create the hierarchical layout with d3.hierarchy
  // Ref: https://d3js.org/d3-hierarchy/hierarchy
  // According to docu above (copy&paste)
  // If data is a Map, it is implicitly converted to the entry [undefined, data], and the children accessor instead defaults to:
  // function children(d) {
  //  return Array.isArray(d) ? d[1] : null;
  //}
  // This allows us to pass the result of group or rollup to hierarchy
  // So it checks whether the child is another array and expands it in the case 

  const root = d3.hierarchy(group, ([key, value]) =>
    value instanceof Map ? Array.from(value) : null
  )
  .sum(([key, value]) => value.avg_price);
    //.sort((a, b) => d3.descending(a.value, b.value));

  console.log(root) // This format I do not entirely get but I also did not during the tutorial
  
  // 3. Compute the treemap layout
  // Ref: https://d3js.org/d3-hierarchy/treemap
  d3.treemap()
   .tile(d3.treemapSquarify)
   .size([width, height])
   .padding(2)
   (root); // calling it here with root >> that when root existds the d3 treemap is executed
  
  // 4. Add leave nodes to the SVG element
  const node = svg.selectAll("a") // TODO look up <a> element in HTML, has something to do with hyperlinks
   .data(root.leaves())
   .join("a")
    .attr("transform", d => `translate(${d.x0}, ${d.y0})`);
  
  console.log(node);
  
  node.append("rect")
   .attr("fill", d => color(d.parent.data[0]))
   .attr("fill-opacity", 0.5)
   .attr("width", d => d.x1 - d.x0)
   .attr("height", d => d.y1 - d.y0);

  console.log(node);

  // 5. Add the tooltip to each node
  node.append("title")
  .text(d => `${d.data[0]} (${d.parent.data[0]})
              \nAvg Price: ${d3.format(".2f")(d.data[1].avg_price)}
              \nAvg Rating: ${d3.format(".2f")(d.data[1].avg_rating)}`);

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
       .html(d =>`<tspan x=5 y=15 font-weight="bold">${d.data[0]}</tspan>
                   <tspan x=5 y=30 fill-opacity=0.7>${d3.format("$.3s")(d.data[1].avg_price)}</tspan>`)
}
