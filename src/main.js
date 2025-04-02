import { TouristVis } from "./viz1.js";
import * as d3 from "d3";
import { RadialBarViz } from "./radialBarViz.js";
import { WordCloud } from "./wordcloudviz.js";
import { ProfileViz } from "./profileViz.js";
import { BarViz } from "./barViz.js";

let mapVis, radialBarViz;

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

  const locationsCopy = JSON.parse(JSON.stringify(locations));
  const localMentionsCopy = JSON.parse(JSON.stringify(localMentions));

  const locationsByID = Object.fromEntries(locationsCopy.map(l => [l.location_id, l]));;
  const locationInput = localMentionsCopy.map(l => ({...l, location: locationsByID[l.location_id]}));
  

  document.getElementById("personSort").innerHTML = `
  <div id="accordion-collapse" data-accordion="collapse">
    ${personInfo.map((p, index) => `
      <h2 id="accordion-collapse-heading-${index}">
        <button type="button" class="accordion-button flex items-center justify-between w-full p-3 font-medium rtl:text-right text-gray-500 border border-b-0 border-gray-200 rounded-t-xl focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 gap-3" data-accordion-target="#accordion-collapse-body-${index}" aria-expanded="false" aria-controls="accordion-collapse-body-${index}" data-person="${p.Person}">
          <span>${p.Person}</span>
          <svg data-accordion-icon class="w-3 h-3 shrink-0 rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5 5 1 1 5"/>
          </svg>
        </button>
      </h2>
      <div id="accordion-collapse-body-${index}" class="accordion-body hidden" aria-labelledby="accordion-collapse-heading-${index}">
        <div id="profile-container-${index}" class="p-5 border border-b-0 border-gray-200 dark:border-gray-700">
          <!-- ProfileViz will be rendered here -->
        </div>
      </div>
    `).join("")}
  </div>`;

// Attach event listeners to accordion buttons
document.querySelectorAll(".accordion-button").forEach(button => {
  button.addEventListener("click", function () {
    const targetId = this.getAttribute("data-accordion-target");
    const targetElement = document.querySelector(targetId);
    // Close all other accordions first
    document.querySelectorAll(".accordion-button").forEach(otherButton => {
      if (otherButton !== this) {
        const otherTargetId = otherButton.getAttribute("data-accordion-target");
        const otherTargetElement = document.querySelector(otherTargetId);
        otherButton.setAttribute("aria-expanded", "false");
        otherTargetElement.classList.add("hidden");
        const otherIcon = otherButton.querySelector("[data-accordion-icon]");
        otherIcon.classList.add("rotate-180");
      }
    });

    // Toggle visibility of the clicked accordion body
    const isExpanded = this.getAttribute("aria-expanded") === "true";
    this.setAttribute("aria-expanded", !isExpanded);
    targetElement.classList.toggle("hidden", isExpanded);
    const dataAcordianIcon = this.querySelector("[data-accordion-icon]");
    dataAcordianIcon.classList.toggle("rotate-180", isExpanded);

    // If the accordion body is revealed, render the ProfileViz
    if (!isExpanded) {
      const profileContainer = document.getElementById(`profile-container-${targetId.split("-").pop()}`);
      profileContainer.innerHTML = ""; 
      const profileViz = new ProfileViz({
        parentElement: profileContainer,
        profile: personInfo.find(p => p.Person === this.getAttribute("data-person")),
        localLocationData: locationInput
      });
      profileViz.render();
    }
  });
});

  // Note: Parameter order now is locationData, onlineMentions, personInfo, localMentions.
  mapVis = new TouristVis(locations,
      onlineMentions,
      personInfo,
      localMentions,
      (mention) => mention.length > 0 ? changeSelectedPlace(mention[0].Name) : null,
      () => changeSelectedPlace());
  mapVis.initVis();

  // Prepare category data for RadialBarViz
  const categories = getCategoryMentionCounts(
      getOnlineLocationData(locations, onlineMentions),
      getLocalLocationData(locations, localMentions)
  );

  const handleRadialBarClick = (label) => {
    mapVis.updateVis(null, null, label);
  }

  // Initialize radial bar visualization
  radialBarViz = new RadialBarViz("radialVis", categories, handleRadialBarClick);
  radialBarViz.initVis();

  let selectedPlace = null;

  function changeSelectedPlace(place) {
    selectedPlace = place;
    wordCloud.selectWord(place);
    onlineBarGraph.setSelected(place);
    if (place == null) {
      mapVis.closeInfoWindow();
    }
  }

  // Prepare data for WordCloud
  const wordCloudData = onlineMentions.map(d => ({
    word: d.Name,
    size: normalizeWordcloudSize(d.count),
    location_id: d.location_id
  }));

  function handleWordCloudHover(word) {
    // Highlight bar graph and open map info window when hovering over words
    if (word == null) {
      mapVis.closeInfoWindow();
      onlineBarGraph.highlightBar();
    } else {
      mapVis.openInfoWindow(word.location_id);
      onlineBarGraph.highlightBar(word.word);
    }
  }

  // Initialize WordCloud
  const wordCloud = new WordCloud(
    "wordCloudVis",
    wordCloudData,
    { width: 900, height: 450 },
    handleWordCloudHover,
    changeSelectedPlace
  );
  wordCloud.initVis();

  const onlineBarGraphMargin = {top: 30, right: 30, bottom: 70, left: 60},
      onlineBarGraphWidth = (420 - onlineBarGraphMargin.left - onlineBarGraphMargin.right) * 2,
      onlineBarGraphHeight = 400 - onlineBarGraphMargin.top - onlineBarGraphMargin.bottom;
  const onlineBarGraph = new BarViz({
    data: onlineMentions,
    getX: d => d.Name,
    getY: d => d.count,
    dims: {margin: onlineBarGraphMargin, width: onlineBarGraphWidth, height: onlineBarGraphHeight},
    onHover: (bar) => {
      // Highlight bar graph and open map info window when hovering over bars
      if (bar == null) {
        mapVis.closeInfoWindow();
        wordCloud.highlightWord();
      } else {
        mapVis.openInfoWindow(bar.location_id)
        wordCloud.highlightWord(bar.Name);
      }
    },
    onClick: changeSelectedPlace,
  });
  const svg = d3.select("#wordCloudVis")
      .append("svg")
      .attr("width", onlineBarGraphWidth + onlineBarGraphMargin.left + onlineBarGraphMargin.right)
      .attr("height", onlineBarGraphHeight + onlineBarGraphMargin.top + onlineBarGraphMargin.bottom + 50);
  onlineBarGraph.draw(svg)
}

function getCategoryMentionCounts(onlineLocationData, localLocationData) {
  let categoryCounts = {};
  onlineLocationData
      .forEach(({location: {category}}) => {
        categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      });
  const categories = Object.entries(categoryCounts)
      .map(([category, count]) => ({label: category, value: count, key: 1}))
      .sort((a, b) => b.value - a.value);
  categoryCounts = {};
  localLocationData
      .forEach(({location: {category}}) => {
        categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      });
  Object.entries(categoryCounts).forEach(([category, count]) => categories.push({
    label: category,
    value: count,
    key: 2
  }));
  return categories;
}

function getLocalLocationData(locations, local) {
  const locationById = Object.fromEntries(locations.map(l => [l.location_id, l]));
  return local.map(l => ({...l, location: locationById[l.location_id]}));
}

export function getOnlineLocationData(locations, online) {
  const locationById = Object.fromEntries(locations.map(l => [l.location_id, l]));
  return online.map(l => ({...l, location: locationById[l.location_id]}));
}


function normalizeWordcloudSize(count) {
  const center = 15;
  const magnitude = 30;
  const minSize = 5;
  return (Math.tanh((count - center) / center) + 1) * magnitude + minSize;
}