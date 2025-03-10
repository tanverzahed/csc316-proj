// Styling for the google maps
const mapStyles = [
  {
    stylers: [
      { hue: "#00ffe6" },
      { saturation: -70 },
      { lightness: 10 },
      { gamma: 1.0 }
    ]
  },{
    featureType: "administrative",
    stylers: [
      { gamma: 0 },
      { visibility: "simplified" }
    ]
  },{
    featureType: "road.local",
    stylers: [
      { gamma: -30 },
      { visibility: "on" },
      { strokeWeight: 3},
      { strokeColor: "black"}
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

class TorontoTouristVisualization {
  constructor() {
    this.map = null;
    this.overlay = null;
    this.locations = null;
    this.onlineMentions = null;
    this.localMentions = null;
    this.personInfo = null;
    this.currentInfoWindow = null;
    this.addMarkerStyles();
  }

  addMarkerStyles() {
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

  async init() {
    try {
      await this.loadData();
      this.initMap();
      this.createVisualization();
    } catch (error) {
      console.error("Error initializing visualization:", error);
    }
  }

  async loadData() {
    try {
      const [locationsData, onlineMentionsData, localMentionsData, personInfoData] = await Promise.all([
        d3.json("/data/locations_data.json"),
        d3.json("/data/online_mentions.json"),
        d3.json("/data/local_mentions.json").catch(() => []),
        d3.json("/data/person_info.json").catch(() => [])
      ]);
      
      this.locations = locationsData;
      this.onlineMentions = onlineMentionsData;
      this.localMentions = localMentionsData || []; 
      this.personInfo = personInfoData;
      
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    }
  }

  initMap() {
    if (!document.getElementById("map")) {
      const mapContainer = document.createElement("div");
      mapContainer.id = "map";
      mapContainer.style.width = "100%";
      mapContainer.style.height = "500px";
      document.getElementById("visualization").appendChild(mapContainer);
    }
    
    this.map = new google.maps.Map(document.getElementById("map"), {
      zoom: 11,
      center: new google.maps.LatLng(43.6532, -79.3832), // Toronto coordinates
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });
    
    this.map.setOptions({ styles: mapStyles });
  }

  getOnlineMentionCount(locationId) {
    const mention = this.onlineMentions.find(m => m.location_id === locationId);
    return mention ? mention.count : 0;
  }
  
  hasLocalMention(locationId) {
    return this.localMentions.some(m => m.location_id === locationId);
  }


  createVisualization() {
    const validLocations = this.locations.filter(loc => 
      loc.latitude !== null && loc.longitude !== null
    );
    
    const self = this;
    const markers = [];
    const infoWindow = new google.maps.InfoWindow();
    
    validLocations.forEach(location => {
      const hasLocal = this.hasLocalMention(location.location_id);
      const hasOnline = this.getOnlineMentionCount(location.location_id) > 0;
      
      let markerColor = '#888888'; // default: gray
      if (hasLocal && hasOnline) {
        markerColor = '#9932CC'; // Purple - has both local and online mentions
      } else if (hasLocal) {
        markerColor = '#4CAF50'; // Green - local mentions only
      } else if (hasOnline) {
        markerColor = '#2196F3'; // Blue - online mentions only
      }
      
      const mentions = this.getOnlineMentionCount(location.location_id);
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
        map: this.map,
        title: location.name,
        icon: pinSVG,
        optimized: false
      });
      
      marker.addListener('click', function() {
        self.showInfoWindow(location, infoWindow, marker);
      });
      
      markers.push(marker);
    });
    
    this.markers = markers;
  }

  showInfoWindow(location, infoWindow, marker) {
  console.log("Showing info window for:", location.name);
  
  const onlineMentions = this.getOnlineMentionCount(location.location_id);
  const hasLocalMention = this.hasLocalMention(location.location_id) ? "Yes" : "No";
  
  const content = `
    <div class="info-window">
      <h3>${location.name}</h3>
      <p><strong>Category:</strong> ${location.category || 'N/A'}</p>
      <p><strong>Cost:</strong> ${location.cost || 'N/A'}</p>
      <p><strong>Online Mentions:</strong> ${onlineMentions}</p>
      <p><strong>Has Local Mention:</strong> ${hasLocalMention}</p>
      <p><strong>Address:</strong> ${location.address || 'N/A'}</p>
    </div>
  `;
  
  infoWindow.setContent(content);
  infoWindow.open(this.map, marker);
  
  this.currentInfoWindow = infoWindow;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  window.touristViz = new TorontoTouristVisualization();
  window.touristViz.init();
});