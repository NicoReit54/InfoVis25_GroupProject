# Chicago Crime Vizz
Crime evolution in Chicago districts over time, visualized on a city map using D3.js; featuring scatter and density map views with interactive controls; data prepared to:
- quarterly data from 2001Q1 to 2024Q1
- data source: https://data.cityofchicago.org/api/views/6zsd-gptz/rows.csv?accessType=DOWNLOAD



## Deployed Version
#### Source Code
The **source code** for the visualization can be found in the repository 
[https://github.com/MarkusStefan/AirBnB/tree/d3](https://github.com/MarkusStefan/AirBnB/tree/d3) in the `d3_chicago_viz/` folder $\to$ located in the **d3** branch!

#### Deployed Visualization hosted on GitHub Pages
Find the deployed version of this visualization here: 
   [https://markusstefan.github.io/AirBnB/d3_chicago_viz/](https://markusstefan.github.io/AirBnB/d3_chicago_viz/)


## How to Run (locally)
1. Open a terminal in the root of the repository (`AirBnB/`).
2. Run the following command to start a local Python server:
```bash
python -m http.server 8000
```

3. Open web browser; navigate to:
   [http://localhost:8000/d3_chicago_viz/index.html](http://localhost:8000/d3_chicago_viz/index.html)


## Adjustments / Customization
- sliders & other functionality should be in `app.js`
- webpage for deployment is in `index.html` and consist of a sidebar for controls and main area for visualization
- styles are in `style.css` and can be found within `app.js` and `index.html`

## Features
- **Chicago City Map**: Shows Chicago neighborhoods
- **Time Slider**: Navigate through time periods
- **Play/Pause**: Animation of timeseries
- **Crime Filters**: Toggle specific crime types
- **Toggle View Mode**: Switch between Scatter plot and Density map
- **Opacity**: Adjust the opacity of the visualization layers to adjust visibility




## Data Prep
Simply run `data.ipynb` to download and prepare the data for the visualization. The downloaded dataset (from google-drive) will be processed data saved in the `data/` folder.


## Vizz Details
**Data Variables**
- `crime_cols = ['Date', 'Primary Type', 'Latitude', 'Longitude']`

**Type of Visualization**
- *Geospatial Time Series Chart*: Displays crime incidents over time (aggr. quarterly) on a city map of Chicago

**Visual Encodings**
- **Position ($x, y$)**: Latitude and Longitude of crime incidents on the Chicago map
- **Shape**: 
   - **Scatters**:Each crime incident is represented as a circle on the map, positioned based on its latitude and longitude
   - **Density Map**: Smooth heatmap (contour) overlay showing *concentration* of crime incidents in the given period
- **Color**: Different colors represent different types of crimes
- **Opacity**: Adjustable opacity for better visibility of layers

**Visual Elements**
- **Marks**: Circles for crime incidents - can be selected or deselected based on crime type
- **Axes**: Time slider (hidden dimension) for navigating through different quarters from 2001Q1 to 2024Q1
- **Scales**: 
   - **Spatial**: Geographic scale for mapping latitude and longitude to screen coordinates (coords omitted for simplicity)
   - **Categorial**: Color scale for different crime types
   - **Channels**: Position (x, y), Color, Opacity




## GenAI Usage Declaration & Documentation
Most of the work, including project structure, data preparation, visualization design and deployment was done by myself. Especially, making fine adjustments to parameters such as colors, sizes, scales, layout and so on were done manually.

For the actual coding work, I used GitHub Copilot (Gemini 3) as AI assistant for the following tasks:

**Code Generation**:
- Used GenAI to generate initial code for D3.js visualization, including setting up the SVG canvas, map projection, and basic interactivity (zooming and panning).
   - this involves the core structure of `app.js`, `index.html`, and `style.css` 

**Adjustments**:
- Asked Copilot to implement custom changes, such as 
   - adding play/pause functionality for the time slider and creating filters for different crime types
   - adding "Select All" and "Deselect All" buttons for crime type filters
   - implementing the density map overlay using D3's contour functions + the toggle functionality between scatter and density map views
   - adding opacity slider to adjust visualization layer visibility
   - styling the sidebar and controls for better user experience (especially the zoom behavior)



