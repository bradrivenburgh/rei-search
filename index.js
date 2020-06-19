'use strict'

//Census API Key
const censusKey = '411334e38c7e68a6db0c7768a0a69ff590d3706b';

//Store geoJson, marker, and map stats globally
const msaData = {
    'shape': '',
    'marker': '',
    'stats': {}
}

const errorPopups = {
    notFound: `<p>We could not find that location in the U.S.</p>
    <p>Please enter another zip code or city, state</p>`,
    emptyForm: `<p>Please enter a zip code or city, state</p>`,
    errorMessage: `Something went wrong. Please try again.`,
    createPopup(message) {
        return L.popup({maxWidth:250, className:'errorMessage'})
        .setLatLng([37.828, -96.9])
        .setContent(`${message}`);
    } 
}

//Initialize map with boundaries
const bounds = [
    [75.255846, -179.734770],
    [-16.190105, -0.222074] 
];

let mymap = new L.map('mapid', {
    center: [37.828, -96.9],
    zoom: 3,
    zoomControl: false,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0
});

function onMapLoad() {
    //Position the zoom controls
    L.control.zoom({
        position: 'bottomright'
    }).addTo(mymap);

    //Set initial zoom for small, medium and large screens
    let resetZoom, customMaxZoom;

    if (window.innerWidth < 768) {
        resetZoom = 3;
        customMaxZoom = 10;
    } else if (window.innerWidth >= 768 && screen.width < 1440) {
        resetZoom = 4;
        customMaxZoom = 12;
    } else if (window.innerWidth >= 1440) {
        resetZoom = 5;
        customMaxZoom = 18;
    }
    mymap.setView([37.828, -96.9], resetZoom);

    //Set the base tile layer to OpenStreetMap -- first API call (MapBox static tiles API)
    L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: customMaxZoom,
        minZoom: 2,
        //id: 'mapbox/light-v9', //Grayscale
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoiYnJpdmVuYnUiLCJhIjoiY2tiNzhqajRmMDNkczJwcmdzNHAwOWdrcCJ9.IjzXWYWjnwGbyqqJ-Rgs2g'
    }).addTo(mymap);
}

//Call map tiles and zoom reset when map loads
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

function resetApp() {
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
            errorPopups.createPopup(errorPopups.emptyForm).openOn(mymap);

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
            console.log(error.message);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
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
        if (error) {
            mymap.setView([37.828, -96.9], 3);
            resetApp();
            errorPopups.createPopup(errorPopups.notFound).openOn(mymap);
            
            return error;
        }
        handleStats(response.features[0].properties.GEOID);
        msaData.stats.msaName = response.features[0].properties.NAME; 
        msaData.shape =  L.geoJson(response).addTo(mymap);

        if (window.innerWidth <= 320) {
            mymap.fitBounds(msaData.shape.getBounds(), {
                paddingTopLeft: [40,500]
            });    
        }
        if (window.innerWidth <= 1440) {
            mymap.fitBounds(msaData.shape.getBounds(), {
                paddingTopLeft: [0,300]
            });    
        } else {
            mymap.fitBounds(msaData.shape.getBounds());
        }

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
            console.log(error.message);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
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
            addStatsToMap();            
        })
        .catch(error => {
            console.log(error.message);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
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
            console.log(error.message);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
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
    msaData.shape.bindPopup(`
    <h4>${msaData.stats.msaName}</h4>
    <ul>
        <li>Population growth rate: ${msaData.stats.popGrowthDeclineRate}%</li>
        <li>Price-to-rent ratio: ${msaData.stats.priceRentRatio}</li>
        <li>Median income: $${msaData.stats.medianIncome}</li>
        <li>Top three sectors:
            <ul>
                <li>${msaData.stats.topThreeIndustries[0].industry}: ${msaData.stats.topThreeIndustries[0].population}%</li>
                <li>${msaData.stats.topThreeIndustries[1].industry}: ${msaData.stats.topThreeIndustries[1].population}%</li>
                <li>${msaData.stats.topThreeIndustries[2].industry}: ${msaData.stats.topThreeIndustries[2].population}%</li>
            </ul>
        </li>
        <li>Top three sub-sectors:
            <ul>
                <li>${msaData.stats.topThreeBusinessTypes[0].businessType}: ${msaData.stats.topThreeBusinessTypes[0].employees}</li>
                <li>${msaData.stats.topThreeBusinessTypes[1].businessType}: ${msaData.stats.topThreeBusinessTypes[1].employees}</li>
                <li>${msaData.stats.topThreeBusinessTypes[2].businessType}: ${msaData.stats.topThreeBusinessTypes[2].employees}</li>
            </ul>
        </li>
        <li>Top three occupation types:
            <ul>
                <li>${msaData.stats.topThreeOccupationTypes[0].occupation}: ${msaData.stats.topThreeOccupationTypes[0].population}%</li>
                <li>${msaData.stats.topThreeOccupationTypes[1].occupation}: ${msaData.stats.topThreeOccupationTypes[1].population}%</li>
                <li>${msaData.stats.topThreeOccupationTypes[2].occupation}: ${msaData.stats.topThreeOccupationTypes[2].population}%</li>
            </ul>
        </li>
    </ul>    
    `, {
        maxWidth:200,
        maxHeight:250,
        className:'statsPopup'
    }).openPopup();
}

function handleSearch() {
    onMapLoad();
    handleMapResize();
    handleUserLocation();
    resetApp();
}

//Run app
$(handleSearch);