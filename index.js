'use strict'

//Census API Key
const censusKey = '411334e38c7e68a6db0c7768a0a69ff590d3706b';


//Render map globally

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

//Set the base tile layer to OpenStreetMap -- first API call (MapBox static tiles API)
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

function clearMap() {
    

    mymap.eachLayer(function (layer) {
        console.log(layer);
        console.log(mymap.getLayerID(layer));
    });
}

//Get user input
function getUserLocation() {
    let zipcode = $('#js-zipcode').val();
    let city = $('#js-city').val();
    
    $('section.form').on('submit', event => {
        event.preventDefault();

        clearMap();
        zipcode = $('#js-zipcode').val();
        city = $('#js-city').val();
        
        if (zipcode.length > 0) {
            coordinatesLookup(zipcode);
        } else if (zipcode.length === 0 && city.length > 0) {
            coordinatesLookup(city);
        } else {
            alert('Please submit a zipcode or city, state');
        }
    });
    console.log('getUserLocation ran');
}

function formatQueryParams(params) {
    const queryItems = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    return queryItems.join('&');
}

//Get user coordinates -- second API call (MapBox Geocoding API)
function coordinatesLookup(userLocation) {
    const mapBoxAccessToken = 'pk.eyJ1IjoiYnJpdmVuYnUiLCJhIjoiY2tiNzhqajRmMDNkczJwcmdzNHAwOWdrcCJ9.IjzXWYWjnwGbyqqJ-Rgs2g';

    const endPointURL = `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLocation}.json`;

    const params = {
        limit: 1,
        access_token: mapBoxAccessToken
    }

    const queryString = formatQueryParams(params);
    const url = endPointURL + '?' + queryString;

    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => {
            const lon = responseJson.features[0].center[0];
            console.log('lon is ' + lon);
            const lat = responseJson.features[0].center[1];
            console.log('lat is ' + lat);
            addMSAToMap(lon, lat);
            addMarkerToMap(lon, lat);
        })
        .catch(error => {
            $('#js-error-message').text(`Something went wrong: ${error.message}`);
        });
}

//Determine MSA based on coordinates and render geoJSON shape
//to map with citySDK -- third API call (census geocoder API via citySDK)
function addMSAToMap(lon, lat) {
    census(
    {
      vintage: 2017,
      geoHierarchy: {
        //"metropolitan statistical area/micropolitan statistical area" : "37980"
        "metropolitan statistical area/micropolitan statistical area": {
            lat: lat,
            lng: lon
        }
      },
      geoResolution: '5m',
      sourcePath: ['cbp'],
      values: ['PAYANN']
    },
    function(error, response) {
        L.geoJson(response, {
            onEachFeature: function(feature, layer) {
              layer.bindPopup(
                '<h2>' +
                  feature.properties.NAME + '<h2>'
                  //'</h2><p># of Oil and Gas Extraction businesses: ' +
                  //feature.properties.ESTAB +
                  //'</p>'
              );
            }
          }).addTo(mymap);
    }
  );
}

//Render marker indicating user coordinates to map
function addMarkerToMap(lat, lon) {
    console.log("Adding marker at " + lat + " " + lon);
    //Add a marker
    let marker = L.marker([lon, lat]).addTo(mymap);
}

/*
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
    getUserLocation();
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

//Get MSA GEOID -- CORS issue, may need to cut and just use citySDK
function geoidLookup(lon, lat) {
    const endPointURL = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates`;

    const params = {
        x: lon,
        y: lat,
        format: 'json',
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        layers: 'Metropolitan Statistical Areas'
    }

    const queryString = formatQueryParams(params);
    const url = endPointURL + '?' + queryString;
    console.log(url);    

    fetch(url)
        .then(response => {
            if (response.ok) {
                console.log(response);
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => {
            console.log(responseJson);
        })
        .catch(error => {
            $('#js-error-message').text(`Something went wrong: ${error.message}`);
        })
}
*/
