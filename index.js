'use strict'

//Census API Key
const censusKey = '411334e38c7e68a6db0c7768a0a69ff590d3706b';

//Store geoJson, marker, and MSA stats globally
const msaData = {
    'shape': '',
    'marker': '',
    'stats': {}
}

//Create error messages on map
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
}).on('popupopen', collapsibleContent);

//Load MapBox tiles and set zoom
function onMapLoad() {
    //Position the zoom controls
    L.control.zoom({
        position: 'bottomright'
    }).addTo(mymap);

    //Set initial zoom for small, medium and large screens
    let resetZoom, customMaxZoom;

    if (window.innerWidth < 768) {
        resetZoom = 3;
        customMaxZoom = 12;
    } else if (window.innerWidth >= 768 && screen.width < 1440) {
        resetZoom = 4;
        customMaxZoom = 14;
    } else if (window.innerWidth >= 1440) {
        resetZoom = 5;
        customMaxZoom = 16;
    }
    mymap.setView([37.828, -96.9], resetZoom);

    //Set the base tile layer
    L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: customMaxZoom,
        minZoom: 3,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoiYnJpdmVuYnUiLCJhIjoiY2tiNzhqajRmMDNkczJwcmdzNHAwOWdrcCJ9.IjzXWYWjnwGbyqqJ-Rgs2g'
    }).addTo(mymap);
}

//Call map tiles and zoom reset when map loads
mymap.on('load', onMapLoad);

// Remove marker and geoJson shape with each new search
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
        introAnimation();
        hideInstructions();

        if (zipcode.length > 0) {
            coordinatesLookup(zipcode);
        } else if (zipcode.length === 0 && city.length > 0) {
            coordinatesLookup(city);
        } else {
            mymap.setView([37.828, -96.9], 3);
            errorPopups.createPopup(errorPopups.emptyForm).openOn(mymap);

        }
    });
}
//Run intro animations
function introAnimation() {
    $('main').addClass('moveToTop');
    $('.overlay').addClass('removeOverlay');
}

//Clear instructions after first search
function hideInstructions() {
    $('#js-instructions').empty();
}

function formatQueryParams(params) {
    const queryItems = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    return queryItems.join('&');
}

//Retrieve coordinates from MapBox
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
            mymap.setView([37.828, -96.9], 3);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
        });
}

//Determine MSA based on coordinates and render geoJSON shape
//to map with citySDK
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
            resetApp();
            mymap.setView([37.828, -96.9], 3);
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
        })
        .catch(error => {
            console.log(error.message);
            mymap.setView([37.828, -96.9], 3);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
        });
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
            mymap.setView([37.828, -96.9], 3);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
        });
}


//Retrieve time series statistics from the pep endpoint
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
            mymap.setView([37.828, -96.9], 3);
            errorPopups.createPopup(errorPopups.errorMessage).openOn(mymap);
        });
}

//Calculate and store population growth/decline stats
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
    msaData.stats.popGrowthDeclineRate = ( (cumulativeGrowthOrDecline / averageTotalPopulation) * 100 ).toFixed(2);
}


//Calculate and store price-to-rent ratio
function calcPriceToRent(medianPriceRent) {
    msaData.stats.priceRentRatio = (medianPriceRent[1] / (medianPriceRent[0] * 12)).toFixed(2);
}

//Determine and store top 3 occupation types
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
}

//Determine and store top businesses/employers
function topBusinesses(businessType) {
    const sortedBusinessTypes = businessType.sort( (a, b) => b[4] - a[4]);
    msaData.stats.topThreeBusinessTypes = [];
    for (let i = 2; i < 5; i++) {
        msaData.stats.topThreeBusinessTypes.push(
            {
                businessType: sortedBusinessTypes[i][0],
                employees: ( ( parseInt(sortedBusinessTypes[i][4]) / parseInt( businessType[1][4] ) )*100).toFixed(2)
            }
        );
    }
}

//Add statistics to map vis a leaflet popup
function addStatsToMap() {
    let maxWidth, maxHeight;
    if (window.innerWidth >= 768) {
        maxWidth = 350;
        maxHeight = 350;
    } else {
        maxWidth = 225;
        maxHeight = 250;
    }

    const popupSize = {
        maxWidth: maxWidth,
        maxHeight: maxHeight
    }

    msaData.shape.bindPopup(`
    <h3>${msaData.stats.msaName}</h3>
    <button type="button" class="collapsible">Population growth rate</button>
    <div class="content">
        <p><em>(Higher is better)</em></p>
        <p>${msaData.stats.popGrowthDeclineRate}%</p>
    </div>
    <button type="button" class="collapsible">Price-to-rent ratio</button>
    <div class="content">
        <p><em>(Lower is better)</em></p>
        <p>${msaData.stats.priceRentRatio}</p>
    </div>
    <button type="button" class="collapsible">Median income</button>
    <div class="content">
        <p>$${msaData.stats.medianIncome}</p>
    </div>
    <button type="button" class="collapsible">Top three sectors</button>
    <div class="content">
        <p><em>(Ordered by percentage of working population employed)</em></p>
        <p>${msaData.stats.topThreeBusinessTypes[0].businessType}: ${msaData.stats.topThreeBusinessTypes[0].employees}%</p>
        <p>${msaData.stats.topThreeBusinessTypes[1].businessType}: ${msaData.stats.topThreeBusinessTypes[1].employees}%</p>
        <p>${msaData.stats.topThreeBusinessTypes[2].businessType}: ${msaData.stats.topThreeBusinessTypes[2].employees}%</p>
    </div>
    <button type="button" class="collapsible">Top three occupation types</button>
    <div class="content">
        <p><em>(Ordered by percentage of working population in occupation)</em></p>
        <p>${msaData.stats.topThreeOccupationTypes[0].occupation}: ${msaData.stats.topThreeOccupationTypes[0].population}%</p>
        <p>${msaData.stats.topThreeOccupationTypes[1].occupation}: ${msaData.stats.topThreeOccupationTypes[1].population}%</p>
        <p>${msaData.stats.topThreeOccupationTypes[2].occupation}: ${msaData.stats.topThreeOccupationTypes[2].population}%</p>
    </div>
    `, popupSize).openPopup();    
}

//Make stats in popup collapsible
function collapsibleContent() {
    //Create a collection of child elements of class 'collapsible'
    const coll = document.getElementsByClassName('collapsible');

    //Loop through coll adding a 'click' event listener that
    //toggles the 'active' class, establishes the content
    //to be displayed as the div immediately following
    //the button, and alternately sets the display of the div to
    //'block' or 'none' to expand or collapse the content.
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener('click', function() {
            this.classList.toggle('active');
            let content = this.nextElementSibling;
            if (content.style.display === 'block') {
            content.style.display = 'none';
            } else {
            content.style.display = 'block';
            }
        });
    }
}

function handleSearch() {
    onMapLoad();
    handleUserLocation();
    resetApp();
}

//Run app
$(handleSearch);