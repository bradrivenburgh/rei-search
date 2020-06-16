'use strict'

//Census API Key
const censusKey = '411334e38c7e68a6db0c7768a0a69ff590d3706b';

//Store geoJson, marker, and map stats globally
const msaData = {
    'shape': '',
    'marker': '',
    'stats': {}
}

//Initialize map
let mymap = L.map('mapid');

function onMapLoad() {
    // Set initial zoom for small, medium and large screens
    let initZoom;

    if (window.innerWidth < 768) {
        initZoom = 3;
    } else if (window.innerWidth >= 768 && screen.width < 1440) {
        initZoom = 4;
    } else if (window.innerWidth >= 1440) {
        initZoom = 5;
    }

    mymap.setView([37.828, -96.9], initZoom);

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
}

mymap.on('load', onMapLoad);

// Adjust map zoom level if window is resized
function handleMapResize() {    
    window.onresize = () => {
        if (window.innerWidth < 768) {
            mymap.setZoom(3);
        } else if (window.innerWidth >= 768 && window.innerWidth < 1440) {
            mymap.setZoom(4);
        } else if (window.innerWidth >= 1440) {
            mymap.setZoom(5);
        }
    }
}

function clearMap() {
    $('#js-submit').on('click', () => {
        if (msaData.shape._leaflet_id) {
            mymap.removeLayer(msaData.marker);
            mymap.removeLayer(msaData.shape);    
        }    
    });
}

// user input
function handleUserLocation() {
    $('#js-form').on('submit', event => {
        event.preventDefault();
        let zipcode = $('#js-zipcode').val();
        let city = $('#js-city').val();
        $('#js-form')[0].reset();

        if (zipcode.length > 0) {
            coordinatesLookup(zipcode);
        } else if (zipcode.length === 0 && city.length > 0) {
            coordinatesLookup(city);
        } else {
            alert('Please submit a zipcode or city, state');
        }
    });
}

function formatQueryParams(params) {
    const queryItems = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    return queryItems.join('&');
}

//Retrieve coordinates from MapBox -- second API call (MapBox Geocoding API)
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
            const lng = responseJson.features[0].center[0];
            const lat = responseJson.features[0].center[1];
            addMSAToMap(lng, lat);
            addMarkerToMap(lng, lat);
        })
        .catch(error => {
            $('#js-error-message').text(`Something went wrong: ${error.message}`);
        });
}

//Determine MSA based on coordinates and render geoJSON shape
//to map with citySDK -- third API call (census geocoder API via citySDK)
function addMSAToMap(lng, lat) {
    census(
    {
      vintage: 2017,
      geoHierarchy: {
        "metropolitan statistical area/micropolitan statistical area": {
            lat: lat,
            lng: lng
        }
      },
      geoResolution: '5m',
      sourcePath: ['cbp'],
      values: ['PAYANN']
    },
    (error, response) => {
        if (!response){
            $('#js-error-message').text(`Something went wrong: ${error}. 
            Please enter another location`);
            throw new Error(response.statusText);
        }
        handleStats(response.features[0].properties.GEOID);
        msaData.stats.msaName = response.features[0].properties.NAME; 
        msaData.shape =  L.geoJson(response, {
            onEachFeature: (feature, layer) => {
                layer.bindPopup(
                '<h2>' +
                    feature.properties.NAME + '<h2>'
                    //'</h2><p># of Oil and Gas Extraction businesses: ' +
                    //feature.properties.ESTAB +
                    //'</p>'
                );
            }
            }).addTo(mymap);
            mymap.fitBounds(msaData.shape.getBounds());
    }   
    );  
}

//Render marker indicating user coordinates to map
function addMarkerToMap(lat, lng) {    
    msaData.marker = L.marker([lng, lat]).addTo(mymap);
}

//Retrieve statistics from census
function handleStats(geoid) {
    const endPointURL = `https://api.census.gov/data/2018/acs/acs1/cprofile.html`;
    const variables = 'get=CP03_2018_027E,CP03_2018_028E,CP03_2018_029E,CP03_2018_030E,CP03_2018_031E,CP03_2018_033E,CP03_2018_034E,CP03_2018_035E,CP03_2018_036E,CP03_2018_037E,CP03_2018_038E,CP03_2018_039E,CP03_2018_040E,CP03_2018_041E,CP03_2018_042E,CP03_2018_043E,CP03_2018_044E,CP03_2018_045E,CP03_2018_092E,CP04_2018_134E,CP04_2018_089E&';
    const params = {
        for: `metropolitan statistical area/micropolitan statistical area:${geoid}`,
        key: censusKey
    }
    const queryString = formatQueryParams(params);
    const url = endPointURL + '?' + variables + queryString;

    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => {
            const occupations = [];
            const industries = [];
            const medianPriceRent = [];
            for (let i = 0; i < responseJson[0].length; i++) {
                i < 5 ? occupations.push( parseFloat(responseJson[1][i]) ) :
                i < 18 ? industries.push( parseFloat(responseJson[1][i]) ) :
                i === 18 ? msaData.stats.medianIncome = parseInt( responseJson[1][18] ) :
                i < 21 ? medianPriceRent.push( parseInt(responseJson[1][i]) ) : 
                console.log('Finished gathering acs1 stats');
            }
            topOccupations(occupations);
            topIndustries(industries);
            calcPriceToRent(medianPriceRent);

        })
        .catch(error => {
            $('#js-error-message').text(`Something went wrong: ${error.message}`);
        });
}

//Calculate, and store population growth/decline stats
function calcPopStats() {

}

//Calculate price-to-rent ratio
function calcPriceToRent(medianPriceRent) {
    msaData.stats.priceRentRatio = medianPriceRent[1] / medianPriceRent[0];
}

//Determine top 3 industries
function topIndustries(industries) {
    const labeledIndustries = [
        {industry:'Agriculture, forestry, fishing and hunting, and mining', population: 0},
        {industry: 'Construction', population: 0},
        {industry: 'Manufacturing', population: 0},
        {industry: 'Wholesale trade', population: 0},
        {industry: 'Retail trade', population: 0},
        {industry: 'Transportation and warehousing, and utilities', population: 0},
        {industry: 'Information', population: 0},
        {industry: 'Finance and insurance, and real estate and rental and leasing', population: 0},
        {industry: 'Professional, scientific, and management, and administrative and waste management services', population: 0},
        {industry: 'Educational services, and health care and social assistance', population: 0},
        {industry: 'Arts, entertainment, and recreation, and accommodation and food services', population: 0},
        {industry: 'Other services, except public administration', population: 0},
        {industry: 'Public administration', population: 0}
    ];
    for (let i = 0; i < industries.length; i++) {
        labeledIndustries[i].population = industries[i];
    }
    let sortedIndustries = labeledIndustries.sort( (a, b) => b.population - a.population );
    msaData.stats.topThreeIndustries = [];
    for (let i = 0; i < 3; i++) {
        msaData.stats.topThreeIndustries.push(sortedIndustries[i]);
    }
}

//Determine top 3 occupation types
function topOccupations(occupations) {
    
}

/*
//Render statistics to map pop-up
function addStatsToMap()

//Reset variables with new search
function resetApp()
*/

function handleSearch() {
    onMapLoad();
    handleMapResize();
    handleUserLocation();
    clearMap();
}

//Run app
$(handleSearch);