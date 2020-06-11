/* ------Map------ */

let initZoom;

// Set initial zoom for small, medium and large screens
if (window.innerWidth < 768) {
    initZoom = 3;
} else if (window.innerWidth >= 768 && screen.width < 1440) {
    initZoom = 4;
} else if (window.innerWidth >= 1440) {
    initZoom = 5;
}


let mymap = L.map('mapid').setView([37.828, -96.9], initZoom);
L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}`, {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    //id: 'mapbox/light-v9', //Grayscale
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiYnJpdmVuYnUiLCJhIjoiY2tiNzhqajRmMDNkczJwcmdzNHAwOWdrcCJ9.IjzXWYWjnwGbyqqJ-Rgs2g'
}).addTo(mymap);

L.geoJson(statesData).addTo(mymap);

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

// Define color scheme of map based on pop density.  Probably won't use anything below this comment for map.

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
