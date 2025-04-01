
import { TouristVis } from "./viz1.js";
import { stack } from "d3";
import { RadialBarViz } from "./radialBarViz.js";
import { WordCloud } from "./wordcloudviz.js";

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
          class="flex items-center justify-between gap-4 rounded border border-gray-300 bg-white p-3 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 has-checked:border-blue-600 has-checked:ring-1 has-checked:ring-blue-600"
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
  const categoryCounts = {};
  locations.forEach(location => {
    const category = location.category;
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  });
  console.log(categoryCounts);
  const categories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ label: category, value: count, key: 1 }))
    .sort((a, b) => b.value - a.value);

  // Initialize radial bar visualization
  radialBarViz = new RadialBarViz("radialVis", categories, mapVis);
  radialBarViz.initVis();

  function normalizeWordcloudSize(count) {
    const center = 15;
    const magnitude = 30;
    const minSize = 5;
    return (Math.tanh((count - center) / center) + 1) * magnitude + minSize;
  }
    // Prepare data for WordCloud
    const wordCloudData = onlineMentions.map(d => ({
      word: d.Name,
      size: normalizeWordcloudSize(d.count),
      location_id: d.location_id
    }));
    console.log(wordCloudData);
    function wordCloudOnHover() {
      console.log("WordCloud hovered");
    }
    
    function wordCloudOnClick() {
      console.log("WordCloud clicked");
    }
  
    // Initialize WordCloud
    const wordCloud = new WordCloud(
      "wordCloudContainer",
      wordCloudData,
      { width: 900, height: 450 }, 
      wordCloudOnHover,
      wordCloudOnClick
    );
    wordCloud.initVis();
}

