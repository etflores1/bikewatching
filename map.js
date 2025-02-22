import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


console.log("Mapbox GL JS Loaded:", mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiZXRmbG9yZXMiLCJhIjoiY203ZnVpazBhMHJ3NjJtcTMwMDE2NjNzdyJ9.QzPfk6OFXouJrnlDTdRmyA';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});

map.on('load', async () => { 
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
    });
  
    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'boston_route',
      paint: {
        'line-color': '#32D400',  // A bright green using hex code
        'line-width': 5,          // Thicker lines
        'line-opacity': 0.6       // Slightly less transparent
      }
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson' // Cambridge data source
      });
    
      map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
          'line-color': '#32D400',  // Tomato color for Cambridge bike lanes
          'line-width': 5,          
          'line-opacity': 0.6       
        }
      });

    let stations;
    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        
        // Await JSON fetch
        const jsonData = await d3.json(jsonurl);
        
        stations = jsonData.data.stations;
        console.log('Stations Array:', stations);; // Log to verify structure
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }


    // step 4
    let trips;
    try {
        const tripsUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
        trips = await d3.csv(tripsUrl);
        console.log('Traffic Data:', trips);
    } catch (error) {
        console.error('Error loading traffic data:', error);
    }

    const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id,
      );

    
    const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id
    );

    stations = stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
        return station;
    });

    console.log('Stations with Traffic Data:', stations);

    const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]); // end of step 4

    const svg = d3.select('#map').select('svg');

    // Append circles to the SVG for each station
    const circles = svg.selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', d => radiusScale(d.totalTraffic))               // Radius of the circle
    .attr('fill', 'steelblue')  // Circle fill color
    .attr('stroke', 'white')    // Circle border color
    .attr('stroke-width', 1)    // Circle border thickness
    .attr('opacity', 0.8)      // Circle opacity
    .each(function(d) {
        // Add <title> for browser tooltips
        d3.select(this)
          .append('title')
          .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
      });

    // Function to update circle positions when the map moves/zooms
    function updatePositions() {
        circles
            .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
            .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
    }
    
    // Initial position update when map loads
    updatePositions();

    // Reposition markers on map interactions
    map.on('move', updatePositions);     // Update during map movement
    map.on('zoom', updatePositions);     // Update during zooming
    map.on('resize', updatePositions);   // Update on window resize
    map.on('moveend', updatePositions);  // Final adjustment after movement ends

    const timeSlider = document.getElementById('#time-slider');
    const selectedTime = document.getElementById('#selected-time');
    const anyTimeLabel = document.getElementById('#any-time');

    function updateTimeDisplay() {
        timeFilter = Number(timeSlider.value);  // Get slider value
      
        if (timeFilter === -1) {
          selectedTime.textContent = '';  // Clear time display
          anyTimeLabel.style.display = 'block';  // Show "(any time)"
        } else {
          selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
          anyTimeLabel.style.display = 'none';  // Hide "(any time)"
        }
      
        // Trigger filtering logic which will be implemented in the next step
        timeSlider.addEventListener('input', updateTimeDisplay);

      }

    updateTimeDisplay();    

});

  function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point);  // Project to pixel coordinates
    return { cx: x, cy: y };  // Return as object for use in SVG attributes
  }

  function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
  }
