import * as d3 from 'd3';

const colors = {
        default: '#69b3a2',
        secondary: '#278872',
        selected: '#ff7d12',
        hover: '#ff7d12',
    }

/**
 * @typedef {Object} Bar
 * @property {string} label
 * @property {number} value
 * @property key
 */


export class RadialBarViz {
    /**
     * @param parentElementId
     * @param data {Bar[]}
     */
    constructor(parentElementId, data, mapVIs) {
        this.parentElementId = parentElementId;
        this.data = data;
        this.mapVis = mapVIs;
        this.selected = null;
        this.selectedBar = null;
    }

    initVis() {
        const viz = this;
        const {data, parentElementId} = this;
        // set the dimensions and margins of the graph
        var margin = {top: 100, right: 0, bottom: 0, left: 0},
            width = 500 - margin.left - margin.right,
            height = 600 - margin.top - margin.bottom,
            innerRadius = 90,
            outerRadius = 230;   // the outerRadius goes from the middle of the SVG area to the border

        // append the svg object
        const parent = d3.select("#" + parentElementId)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
        const svg = parent
            .append("g")
            .attr("transform", "translate(" + (width / 2 - 25) + "," + (height / 2 + margin.top - 30) + ")");

        const stackedDataMap = {};
        const keyObj = {}
        data.forEach(d => {
            const row = stackedDataMap[d.label] ?? {label: d.label, _total: 0}
            row[d.key] = d.value;
            row._total += d.value;
            stackedDataMap[d.label] = row;
            keyObj[d.key] = 1;
        })
        const keys = Object.keys(keyObj);
        const stackedData = Object.values(stackedDataMap);

        // Scales
        var x = d3.scaleBand()
            .range([0, 2 * Math.PI])    // X axis goes from 0 to 2pi = all around the circle. If I stop at 1Pi, it will be around a half circle
            .align(0)                  // This does nothing
            .domain(data.map(function(d) { return d.label; })); // The domain of the X axis is the list of states.
        var y = d3.scaleRadial()
            .range([innerRadius, outerRadius])   // Domain will be define later.
            .domain([0, d3.max(stackedData, d => d._total)]); // Domain of Y is from 0 to the max seen in the data

        const label = parent.append("text")
            .attr("x", 50)
            .attr("y", 90)

        // Add the bars
        svg.append("g")
            .selectAll("g")
            .data(d3.stack().keys(keys)(stackedData))
            .enter().append("g")
            .selectAll("path")
            .data(d => d)
            .enter()
            .append("path")
            .attr("fill", d => d[0] !== 0 ? colors.secondary : colors.default)
            .attr("d", d3.arc()     // imagine your doing a part of a donut plot
                .innerRadius(d => y(isNaN(d[0]) ? 0 : d[0]))
                .outerRadius(function(d) {return y(isNaN(d[1]) ? d[0] : d[1]); })
                .startAngle(function(d) { return x(d.data.label); })
                .endAngle(function(d) { return x(d.data.label) + x.bandwidth(); })
                .padAngle(0.01)
                .padRadius(innerRadius))
            .on('mouseover', function(event, d) {
                const bar = d3.select(this).style('fill', colors.hover)
                bar.style('cursor', 'pointer');
                if (viz.mapVis) viz.mapVis.updateVis(null, null, d.data.label);

                const range = (isNaN(d[1]) ? d[0] : d[1]) - (isNaN(d[0]) ? 0 : d[0]);
                label.text(`${range} mention${range === 1 ? '' : 's'} (total: ${d.data._total})`);

            })
            .on('mouseout', function(event, d) {
                const bar = d3.select(this).style('fill', d === viz.selected ? colors.hover : d[0] !== 0 ? colors.secondary : colors.default);
                bar.style('cursor', 'default');
            
                // Call the onHover callback or reset the mapVis if no bar is selected
                if (viz.onHover) {
                    viz.onHover(viz.selected?.data);
                } else if (viz.mapVis && !viz.selected) {
                    viz.mapVis.updateVis(null, null, null); // Reset mapVis when no bar is selected
                }
            
                // Update the label if a bar is selected
                if (viz.selected) {
                    const s = viz.selected;
                    const range = (isNaN(s[1]) ? s[0] : s[1]) - (isNaN(s[0]) ? 0 : s[0]);
                    label.text(`${range} mention${range === 1 ? '' : 's'} (total: ${s.data._total})`);
                } else {
                    label.text(""); // Clear the label if no bar is selected
                }
            })
            .on('click', function(event, d) {
                viz.selected = viz.selected === d ? null : d;

                // Update the selected bar's style
                if (viz.selectedBar && viz.selectedBar !== this) {
                    d3.select(viz.selectedBar).style('fill', colors.default);
                }
                viz.selectedBar = this;
            
                // Highlight the selected bar or reset if deselected
                d3.select(this).style('fill', viz.selected ? colors.selected : colors.default);
            
                // Update mapVis based on the selected bar
                if (viz.mapVis) {
                    if (viz.selected) {
                        viz.mapVis.updateVis(null, null, d.data.label); // Pass the selected category to mapVis
                    } else {
                        viz.mapVis.updateVis(null, null, null); // Reset mapVis if deselected
                    }
                }
            })

        // Add the labels
        svg.append("g")
            .selectAll("g")
            .data(stackedData)
            .enter()
            .append("g")
            .attr("text-anchor", function(d) { return (x(d.label) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start"; })
            .attr("transform", function(d) { return "rotate(" + ((x(d.label) + x.bandwidth() / 2) * 180 / Math.PI - 90) + ")"+"translate(" + (y(d._total)+10) + ",0)"; })
            .append("text")
            .text(function(d){return(d.label)})
            .attr("transform", function(d) { return (x(d.label) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)"; })
            .style("font-size", "11px")
            .attr("alignment-baseline", "middle")

    }
}