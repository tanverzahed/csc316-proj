// Styling for the google maps
const mapStyles = [
  {
    stylers: [
      { hue: "#00ffe6" },
      { saturation: -70 },
      { lightness: 10 },
      { gamma: 1.0 }
    ]
  },
  {
    featureType: "administrative",
    stylers: [
      { gamma: 0 },
      { visibility: "simplified" }
    ]
  },
  {
    featureType: "road.local",
    stylers: [
      { gamma: -30 },
      { visibility: "on" },
      { strokeWeight: 3 },
      { strokeColor: "black" }
    ]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [
      { visibility: "off" }
    ]
  },
  {
    featureType: "administrative",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text",
    stylers: [
      { visibility: "on" }
    ]
  },
  {
    featureType: "landscape.man_made",
    stylers: [
      { visibility: "simplified" }
    ]
  },
  {
    featureType: "transit",
    stylers: [
      { visibility: "off" }
    ]
  }
];

class TouristVis {
  constructor(locationData, onlineMentions, personInfo, localMentions) {
    const vis = this;
    vis.map = null;
    vis.overlay = null;
    vis.locationData = locationData;      // Contains the locations (with latitude/longitude)
    vis.onlineMentions = onlineMentions;    // Online mentions data for each location
    vis.personInfo = personInfo;            // Additional information about persons
    vis.localMentions = localMentions;      // Local mentions data, which include a "Person" property
    vis.currentInfoWindow = null;
    vis.markers = [];
    vis.addMarkerStyles();
  }

  addMarkerStyles() {
    const vis = this;
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .marker {
        position: absolute;
        cursor: pointer;
      }
      .marker circle {
        stroke: #000;
        stroke-width: 1px;
      }
      .marker text {
        fill: black;
        font: 10px sans-serif;
        text-anchor: start;
      }
      .info-window {
        padding: 10px;
        max-width: 200px;
      }
      .info-window h3 {
        margin-top: 0;
        font-size: 14px;
      }
      .info-window p {
        margin-bottom: 5px;
        font-size: 12px;
      }
    `;
    document.head.appendChild(styleElement);
  }

  initVis() {
    const vis = this;
    vis.initMap();
    vis.wrangleData();
  }

  initMap() {
    const vis = this;
    if (!document.getElementById("map")) {
      const mapContainer = document.createElement("div");
      mapContainer.id = "map";
      mapContainer.style.width = "100%";
      mapContainer.style.height = "500px";
      document.getElementById("visualization").appendChild(mapContainer);
    }
    vis.map = new google.maps.Map(document.getElementById("map"), {
      zoom: 11,
      center: new google.maps.LatLng(43.6532, -79.3832), // Toronto coordinates
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    vis.map.setOptions({ styles: mapStyles });
  }

  wrangleData() {
    const vis = this;
    vis.validLocations = vis.locationData.filter(loc =>
      loc.latitude !== null && loc.longitude !== null
    );
    vis.updateVis(null);
  }

  updateVis(Person) {
    const vis = this;
    // Clear existing markers.
    vis.markers.forEach(marker => marker.setMap(null));
    vis.markers = [];
    const infoWindow = new google.maps.InfoWindow();
    
    if (vis.validLocations && vis.validLocations.length > 0) {
      vis.validLocations.forEach(location => {
        // If a Person filter is provided, check for a matching local mention.
        if (Person) {
          const localMatch = vis.localMentions.some(m =>
            m.location_id === location.location_id && m.Person === Person
          );
          if (!localMatch) return;
        }
        // Determine marker styles.
        const hasLocal = Person
          ? true  // If filtering by Person, a match exists.
          : vis.hasLocalMention(location.location_id);
        const hasOnline = vis.getOnlineMentionCount(location.location_id) > 0;
        let markerColor = '#888888'; // Default: gray
        if (hasLocal && hasOnline) {
          markerColor = '#9932CC'; // Purple: both local and online mentions
        } else if (hasLocal) {
          markerColor = '#4CAF50'; // Green: local mentions only
        } else if (hasOnline) {
          markerColor = '#2196F3'; // Blue: online mentions only
        }
        const mentions = vis.getOnlineMentionCount(location.location_id);
        const markerSize = Math.max(4, Math.min(10, 4 + mentions / 4));
        const pinSVG = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 0.7,
          strokeWeight: 1,
          strokeColor: '#000000',
          scale: markerSize
        };
        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(location.latitude, location.longitude),
          map: vis.map,
          title: location.name,
          icon: pinSVG,
          optimized: false
        });
        marker.addListener('click', function() {
          vis.showInfoWindow(location, infoWindow, marker);
        });
        vis.markers.push(marker);
      });
    }
  }

  getOnlineMentionCount(locationId) {
    const vis = this;
    const mention = vis.onlineMentions.find(m => m.location_id === locationId);
    return mention ? mention.count : 0;
  }

  hasLocalMention(locationId) {
    const vis = this;
    return vis.localMentions.some(m => m.location_id === locationId);
  }

  showInfoWindow(location, infoWindow, marker) {
    const vis = this;
    const onlineMentions = vis.getOnlineMentionCount(location.location_id);
    const localFlag = vis.hasLocalMention(location.location_id) ? "Yes" : "No";
    const localPerson = vis.localMentions.filter(m => m.location_id === location.location_id);
    const localPersonString = localPerson.map(m => m.Person).join(", ") || "N/A";
    const content = `
      <div class="info-window">
        <h3>${location.name}</h3>
        <p><strong>Category:</strong> ${location.category || 'N/A'}</p>
        <p><strong>Cost:</strong> ${location.cost || 'N/A'}</p>
        <p><strong>Online Mentions:</strong> ${onlineMentions}</p>
        <p><strong>Recommended by:</strong> ${localPersonString}</p>
        <p><strong>Address:</strong> ${location.address || 'N/A'}</p>
      </div>
    `;
    infoWindow.setContent(content);
    infoWindow.open(vis.map, marker);
    vis.currentInfoWindow = infoWindow;
  }
}

let mapVis;

let promises = [
    d3.json("/data/locations_data.json"),
    d3.json("/data/online_mentions.json"),
    d3.json("/data/person_info.json"),
    d3.json("/data/local_mentions.json")
];

Promise.all(promises)
  .then(function(data){ initMainPage(data) })
  .catch(function(err){ console.log(err) });

// initMainPage
function initMainPage(allDataArray) {
  const locations = allDataArray[0];
  const onlineMentions = allDataArray[1];
  const personInfo = allDataArray[2];
  const localMentions = allDataArray[3];

  document.getElementById("personSort").innerHTML = `
    <option value="">All</option>
    ${personInfo.map(p => `<option value="${p.Person}">${p.Person}</option>`).join("")}
  `;

  document.getElementById("personSort").addEventListener("change", function() {
    const selectedPerson = this.value;
    mapVis.updateVis(selectedPerson);
  });
  // Note: Parameter order now is locationData, onlineMentions, personInfo, localMentions.
  mapVis = new TouristVis(locations, onlineMentions, personInfo, localMentions);
  mapVis.initVis();
}