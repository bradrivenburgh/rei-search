'use strict'

//Census API Key
const censusKey = '411334e38c7e68a6db0c7768a0a69ff590d3706b';

//Store geoJson, marker, and map stats globally
const msaData = {
    'shape': '',
    'marker': '',
    'stats': {}
}

//Initialize map with boundaries
const bounds = [
    [75.255846, -179.734770],
    [-16.190105, -0.222074] 
];

let mymap = new L.map('mapid', {
    center: [37.828, -96.9],
    zoom: 3,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0
});

function onMapLoad() {

    // Set initial zoom for small, medium and large screens
    let resetZoom;

    if (window.innerWidth < 768) {
        resetZoom = 3;
    } else if (window.innerWidth >= 768 && screen.width < 1440) {
        resetZoom = 4;
    } else if (window.innerWidth >= 1440) {
        resetZoom = 5;
    }
    mymap.setView([37.828, -96.9], resetZoom);

    //Set the base tile layer to OpenStreetMap -- first API call (MapBox static tiles API)
    L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 14,
        minZoom: 2,
        id: 'mapbox/light-v9', //Grayscale
        //id: 'mapbox/streets-v11',
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

// Listen for and capture user input
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
        'metropolitan statistical area/micropolitan statistical area': {
            lat: lat,
            lng: lng
        }
        },
        geoResolution: '5m',
        sourcePath: ['cbp'],
        values: [ 
        'EMP'
        ],
        statsKey: '411334e38c7e68a6db0c7768a0a69ff590d3706b'
    },
    (error, response) => {
        if (!response){
            $('#js-error-message').text(`Something went wrong: ${error}. 
            Please enter another location`);
            throw new Error(response.statusText);
        }
        handleStats(response.features[0].properties.GEOID);
        msaData.stats.msaName = response.features[0].properties.NAME; 
        msaData.shape =  L.geoJson(response /*, {
            

            onEachFeature: (feature, layer) => {
                layer.bindPopup(
                '<h6>' + 'MSA Name: ' +
                    feature.properties.NAME + 
                '<h6>'
                    //'</h2><p># of Oil and Gas Extraction businesses: ' +
                    //feature.properties.ESTAB +
                    //'</p>'
                );
            }

            } */).addTo(mymap);
            mymap.fitBounds(msaData.shape.getBounds());
            addStatsToMap();
    }   
    );  
}

//Render marker indicating user coordinates to map
function addMarkerToMap(lat, lng) {    
    msaData.marker = L.marker([lng, lat]).addTo(mymap);
}

function handleStats(geoid) {
    handleAcsStats(geoid);
    handleCbpStats(geoid);
    handlePepStats(geoid);
}


//Retrieve statistics from census acs1 endpoint
function handleAcsStats(geoid) {
    const endPointURL = `https://api.census.gov/data/2018/acs/acs1/cprofile`;
    const variables = 'get=CP03_2018_027E,CP03_2018_028E,CP03_2018_029E,CP03_2018_030E,CP03_2018_031E,CP03_2018_033E,CP03_2018_034E,CP03_2018_035E,CP03_2018_036E,CP03_2018_037E,CP03_2018_038E,CP03_2018_039E,CP03_2018_040E,CP03_2018_041E,CP03_2018_042E,CP03_2018_043E,CP03_2018_044E,CP03_2018_045E,CP03_2018_092E,CP04_2018_134E,CP04_2018_089E';
    const params = {
        for: `metropolitan statistical area/micropolitan statistical area:${geoid}`,
        key: censusKey
    }
    const queryString = formatQueryParams(params);
    const url = endPointURL + '?' + variables + '&' + queryString;

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
                i === 18 ? msaData.stats.medianIncome = parseInt( responseJson[1][i] ) :
                i < 21 ? medianPriceRent.push( parseInt(responseJson[1][i]) ) : 
                console.log('Finished gathering acs1 stats');
            }
            topOccupationTypes(occupations);
            calcPriceToRent(medianPriceRent);
            topIndustries(industries);
        })
        .catch(error => {
            $('#js-error-message').text(`Something went wrong: ${error.message}`);
        });
        console.log('handleAcsStats ran');
}

//Retrieve statistics from the cbp endpoint
function handleCbpStats(geoid) {
    const endPointURL = `https://api.census.gov/data/2017/cbp`;
    const variables = 'get=NAICS2017_LABEL,NAICS2017,EMPSZES_LABEL,EMPSZES,EMP';
    const predicates = 'EMPSZES=001';
    const params = {
        for: `metropolitan statistical area/micropolitan statistical area:${geoid}`,
        key: censusKey
    }
    const queryString = formatQueryParams(params);
    const url = endPointURL + '?' + variables + '&' + predicates + '&' + queryString;

    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => {
            topBusinesses(responseJson);
        })
        .catch(error => {
            $('#js-error-message').text(`Something went wrong: ${error.message}`);
        });
        console.log('handlCbpStats ran');
}


//Retrieve statistics from the pep endpoint
function handlePepStats(geoid) {
    const endPointURL = `https://api.census.gov/data/2019/pep/population`;
    const variables = 'get=DATE_CODE,DATE_DESC,POP';
    const params = {
        for: `metropolitan statistical area/micropolitan statistical area:${geoid}`,
        key: censusKey
    }
    const queryString = formatQueryParams(params);
    const url = endPointURL + '?' + variables + '&' + queryString;

    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJson => {
            calcPopStats(responseJson);
        })
        .catch(error => {
            $('#js-error-message').text(`Something went wrong: ${error.message}`);
        });
        console.log('handlPepStats ran');

}

//Calculate, and store population growth/decline stats
function calcPopStats(popStats) {
    const popDiff = [];
    for (let i = 3; i < popStats.length -1; i++) {
        popDiff.push( 
            {
                growthOrDecline: popStats[i + 1][2] - popStats[i][2],
                populationTotal: parseInt( popStats[i][2] ) 
            }
            );
    }
    const cumulativeGrowthOrDecline = popDiff.reduce ( (acc, diff) =>  
    acc + diff.growthOrDecline, 0);
    const averageTotalPopulation = popDiff.reduce ( (acc, diff) => 
    acc + diff.populationTotal, 0) / popDiff.length;
    console.log(cumulativeGrowthOrDecline, averageTotalPopulation);
    msaData.stats.popGrowthDeclineRate = ( (cumulativeGrowthOrDecline / averageTotalPopulation) * 100 ).toFixed(2);
        
    console.log(msaData.stats.popGrowthDeclineRate);
}


//Calculate price-to-rent ratio
function calcPriceToRent(medianPriceRent) {
    msaData.stats.priceRentRatio = (medianPriceRent[1] / (medianPriceRent[0] * 12)).toFixed(2);
    console.log('calcPriceToRent ran');
}

//Determine top 3 occupation types
function topOccupationTypes(occupations) {
    const labeledOccupations = [
        {occupation:'Management, business, science, and arts occupations', population: 0},
        {occupation:'Service occupations', population: 0},
        {occupation:'Sales and office occupations', population: 0},
        {occupation:'Natural resources, construction, and maintenance occupations', population: 0},
        {occupation:'Production, transportation, and material moving occupations', population: 0}
    ];
    for (let i = 0; i < occupations.length; i++) {
        labeledOccupations[i].population = occupations[i];
    }
    let sortedOccupations = labeledOccupations.sort( (a, b) => b.population - a.population );
    msaData.stats.topThreeOccupationTypes = [];
    for (let i = 0; i < 3; i++) {
        msaData.stats.topThreeOccupationTypes.push(sortedOccupations[i]);
    }
    console.log('topOccupationTypes ran');
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
    console.log('topIndustries ran');
}

function topBusinesses(businessType) {
    const sortedBusinessTypes = businessType.sort( (a, b) => b[4] - a[4]);
    msaData.stats.topThreeBusinessTypes = [];
    for (let i = 2; i < 5; i++) {
        msaData.stats.topThreeBusinessTypes.push(
            {
                businessType: sortedBusinessTypes[i][0],
                employees: sortedBusinessTypes[i][4]
            }
        );
    }
    console.log('topBusinesses ran');
}


//Render statistics to map pop-up
function addStatsToMap() {
    msaData.shape.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
}

//Reset variables with new search
function resetApp() {

}


function handleSearch() {
    onMapLoad();
    handleMapResize();
    handleUserLocation();
    clearMap();
}

//Run app
$(handleSearch);