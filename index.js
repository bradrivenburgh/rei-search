//Render Map

    // Set initial zoom for small, medium and large screens
    let initZoom;

    if (window.innerWidth < 768) {
        initZoom = 3;
    } else if (window.innerWidth >= 768 && screen.width < 1440) {
        initZoom = 4;
    } else if (window.innerWidth >= 1440) {
        initZoom = 5;
    }

    //Main map layer

    //Initialize map
    let mymap = L.map('mapid').setView([37.828, -96.9], initZoom);

    //Set the base tile layer to OpenStreetMap
    L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        //id: 'mapbox/light-v9', //Grayscale
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoiYnJpdmVuYnUiLCJhIjoiY2tiNzhqajRmMDNkczJwcmdzNHAwOWdrcCJ9.IjzXWYWjnwGbyqqJ-Rgs2g'
    }).addTo(mymap);


    // Adjust zoom level if window is resized
    window.onresize = function() {
        if (window.innerWidth < 768) {
            mymap.setZoom(3);
        } else if (window.innerWidth >= 768 && window.innerWidth < 1440) {
            mymap.setZoom(4);
        } else if (window.innerWidth >= 1440) {
            mymap.setZoom(5);
        }
    }


//Get user input
function getUserLocation() {
    const zipcode = 0;
    const city = "";
    console.log('Ive been submitted');
    $('#js-form').submit(event => {
        event.preventDefault();
        zipcode = $('js-zipcode').val();
        city = $('js-city').val();
    });
    console.log(zipcode, city);
}


/*
//Get user coordinates
function coordinatesLookup()

//Get MSA GEOID
function geoidLookup()

//Render marker indicating user coordinates to map
function addMarkerToMap() {
    //Add a marker
    let marker = L.marker([40.0115, -75.1327]).addTo(mymap);
}
//Get and render geoJSON shape to map with citySDK
function addMsaToMap() {
    
    //Example query with CitySDK. I Can use this
    //to get individual geography geoJSON files!
    //Probably need to remove popup functionality
    //and add it separately.

    census(
    {
      vintage: 2017,
      geoHierarchy: {
        "metropolitan statistical area/micropolitan statistical area" : "37980"
      },
      geoResolution: '500k',
      sourcePath: ['cbp'],
      values: ['ESTAB'] // number of establishments
    },
    function(error, response) {
        L.geoJson(response, {
            onEachFeature: function(feature, layer) {
              layer.bindPopup(
                '<h2>' +
                  feature.properties.NAME +
                  '</h2><p># of Oil and Gas Extraction businesses: ' +
                  feature.properties.ESTAB +
                  '</p>'
              );
            }
          }).addTo(mymap);
    }
  );
}

//Get statistics
function getStats() {
    //Custom query with CitySDK for MSA; unable to get MSA
//geoJSON shapes from acs 1-year data, only national.  
//Use acs1 for stats only

census(
    {
        "sourcePath" : ["acs","acs1"], // source (survey, ACS 1-year profile estimate)
        vintage: 2018, // source (year, 2018)
        values: ["NAME", "B01003_001E"], // metric (column for total population)
        geoHierarchy: {
            "metropolitan statistical area/micropolitan statistical area" : "37980"
        }
    },
    function(error, response) {
        console.log(response);
    }
  );

}

//Get, calculate, and store population growth/decline stats
function calcPopStats()

//Get, calculate, and store job market growth/decline stats
function calcJobMarketStats()

//Calculate price-to-rent ratio
function calcPriceToRent()

//Determine top 5 industries
function topIndustries()

//Get and store median salary for area

//Get and store types of jobs??

//Render statistics to map pop-up
function addStatsToMap()

//Reset variables with new search
function resetApp()
*/

function handleSearch() {
}

//Run app
$(handleSearch);

/* ----

// PROBABLY WILL NOT USE ANYTHING BELOW THIS COMMENT


//Add a circle -- this might be the best option
//if I can't get CitySDK to get geoJson files of
//MSAs
let circle = L.circle([39.9931508, -75.0139605], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 60000
}).addTo(mymap);


//geoJson data that places state boundaries from us-states.js
L.geoJson(statesData).addTo(mymap);



//Add a bounding box
// define rectangle geographical bounds
var bounds = [[39.85, -75.29], [40.13, -74.95]];
// create an orange rectangle
L.rectangle(bounds, {color: "#ff7800", weight: 1}).addTo(mymap);
// zoom the map to the rectangle bounds
//mymap.fitBounds(bounds);



// CHOROPLETH MAP
// Define color scheme of map based on pop density.

function getColor(d) {
    return d > 1000 ? '#800026' :
           d > 500  ? '#BD0026' :
           d > 200  ? '#E31A1C' :
           d > 100  ? '#FC4E2A' :
           d > 50   ? '#FD8D3C' :
           d > 20   ? '#FEB24C' :
           d > 10   ? '#FED976' :
                      '#FFEDA0';
}

function style(feature) {
    return {
        fillColor: getColor(feature.properties.density),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

L.geoJson(statesData, {style: style}).addTo(mymap);

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

var geojson;

	function resetHighlight(e) {
		geojson.resetStyle(e.target);
		info.update();
	}

    function zoomToFeature(e) {
		mymap.fitBounds(e.target.getBounds());
	}

	function onEachFeature(feature, layer) {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
			click: zoomToFeature
		});
	}

	geojson = L.geoJson(statesData, {
		style: style,
		onEachFeature: onEachFeature
	}).addTo(mymap);
*/
