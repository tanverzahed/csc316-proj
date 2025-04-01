import { TouristVis } from "./viz1.js";
import * as d3 from "d3";
import { RadialBarViz } from "./radialBarViz.js";
import { WordCloud } from "./wordcloudviz.js";
import {BarViz} from "./barViz.js";

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

  document.getElementById("personSort").innerHTML = `
  <fieldset id="personSort" class="space-y-3">
    <legend class="sr-only">Select a person</legend>
    ${personInfo.map(p => `
      <div>
        <label
          for="${p.Person}"
          class="flex items-center justify-between gap-4 min-w-full rounded border border-gray-300 bg-white p-3 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 has-checked:border-blue-600 has-checked:ring-1 has-checked:ring-blue-600"
        >
          <div>
            <p class="text-gray-700">${p.Person}</p>
            <p class="text-gray-900">${p.description}</p>
          </div>
          <input
            type="radio"
            name="person"
            value="${p.Person}"
            id="${p.Person}"
            class="size-5 border-gray-300"
          />
        </label>
      </div>
    `).join("")}
  </fieldset>
  <button id="clearSelection" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">
    Clear
  </button>
`;

  document.getElementById("clearSelection").addEventListener("click", function() {
    document.querySelectorAll("input[name='person']").forEach(input => {
      input.checked = false;
    });
    mapVis.updateVis(null);
  });
  document.getElementById("personSort").addEventListener("change", function() {
  const selectedPerson = this.querySelector("input[name='person']:checked").value;
  mapVis.updateVis(selectedPerson);
  });
  // Note: Parameter order now is locationData, onlineMentions, personInfo, localMentions.
  mapVis = new TouristVis(locations, onlineMentions, personInfo, localMentions);
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