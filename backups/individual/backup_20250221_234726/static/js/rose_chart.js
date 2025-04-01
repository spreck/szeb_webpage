
//Add Rose Chart for WUI
// Assuming 'selectedCityName' is the name of the selected city from the dropdown
function getCityPolygon(cityName) {
    // Replace 'your_workspace' with your actual workspace name
    var workspace = 'EvacuationProjects';

    // Make an AJAX request to fetch the city polygon from the GeoPackage
    return fetch(`${geoserverUrl}/wms?service=WMS&version=1.1.0&request=GetFeature&typename=${workspace}:${cityName}&cql_filter=city_name='${cityName}'&outputFormat=application/json`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        // Extract the city polygon geometry from the response data
        if (data && data.features && data.features.length > 0) {
            return data.features[0].geometry; // Assuming the first feature is the city polygon
        } else {
            console.error("City polygon not found for selected city: " + cityName);
            return null;
        }
    })
    .catch(error => {
        console.error("Error fetching city polygon: " + error);
        return null;
    });
}



// Event listener for citySelect dropdown change
citySelect.addEventListener('change', function() {
    var selectedCityName = citySelect.value;

    // Declare directionCounts here
    var directionCounts = [];
    // Fetch the city polygon based on the selected city name
    getCityPolygon(selectedCityName).then(function(selectedCityPolygon) {
        // Calculate the intersection between the selected city polygon and the WUI layer
        var wuiWithinCity = turf.intersect(selectedCityPolygon, wuiLayer.toGeoJSON());

        // Calculate the centroid of the WUI areas within the selected city
        var centroid = turf.centroid(wuiWithinCity);

        // Calculate the bearing (direction) from the centroid to each point in the WUI areas
        var directions = [];
        turf.coordEach(wuiWithinCity, function(coord) {
            var bearing = turf.bearing(centroid, coord);
            directions.push(bearing);
        });

        // Calculate the number of points within each 10-degree increment
        directionCounts = new Array(36).fill(0); // Initialize an array for 36 increments

        directions.forEach(function(bearing) {
            var incrementIndex = Math.floor((bearing + 360) % 360 / 10);
            directionCounts[incrementIndex]++;
        });

        // Update the rose chart with the new directionCounts
        updateRoseChart(directionCounts);
    }).catch(function(error) {
        console.error("Error fetching city polygon: " + error);
    });
});

// Function to update the rose chart
function updateRoseChart(directionCounts) {
    roseChart.data.datasets[0].data = directionCounts;
    roseChart.update();
}

// Initialize the rose chart
var canvas = document.createElement('canvas');
canvas.width = 400;
canvas.height = 400;
document.body.appendChild(canvas);

var labels = [];
for (var i = 0; i < 36; i++) {
    labels.push((i * 10).toString() + '°');
}

var ctx = canvas.getContext('2d');
var roseChart = new Chart(ctx, {
    type: 'polarArea',
    data: {
        labels: labels,
        datasets: [{
            data: [],
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
        }]
    },
    options: {
        scale: {
            ticks: {
                beginAtZero: true,
                max: 10,
            }
        }
    }
});
