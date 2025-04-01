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
    constructor(parentElementId, data, onClick) {
        this.parentElementId = parentElementId;
        this.data = data;
        this.onClick = onClick;
        this.selected = null;
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
            .attr("transform", "translate(" + (width / 2 - 25) + "," + (height / 2 + margin.top - 10) + ")");

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
            .attr("x", width / 2)
            .attr("y", 35)

        const rect = parent.append("rect")
            .attr("stroke", colors.secondary)
            .attr("stroke-width", 1)
            .attr("fill", "none")
            .attr("x", label.node().getBoundingClientRect().x)
            .attr("y", label.node().getBoundingClientRect().y)
            .attr("width", label.node().getBoundingClientRect().width)
            .attr("height", label.node().getBoundingClientRect().height)

        const updateLabel = (text) => {
            label.text(text);
            label.attr("x", (width - label.node().getComputedTextLength()) / 2)
            rect
                .attr("x", label.attr("x") - 10)
                .attr("y", label.attr("y") - label.node().getBoundingClientRect().height)
                .attr("width", label.node().getBoundingClientRect().width + 20)
                .attr("height", label.node().getBoundingClientRect().height + 10)
            if (text === "") rect.attr("width", 0);
        }

        const domain = ["Online", "Local"]
        const legend = svg.append("g")
            .selectAll("g")
            .data(domain)
            .enter().append("g")
            .attr("transform", function(d, i) { return "translate(-40," + (i - 1) * 20 + ")"; });

        legend.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d3.scaleOrdinal().range([colors.default, colors.secondary]).domain(domain));

        legend.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text(function(d) { return d; });

        // Store data points and individually rendered objects to apply styles to entire categories
        viz.barObjects = Object.fromEntries(stackedData.map(d => [d.label, []]))

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
            .style('cursor', 'pointer')
            .each(function(d) {viz.barObjects[d.data.label].push([d, this])})
            .on('mouseover', function(event, d) {
                viz.highlightCategory(d.data.label);
                if (d.data.label !== viz.selected) {
                    // If statement to prevent flicker on hovering same category as selected
                    viz.onClick(d.data.label);
                }

                const range = (isNaN(d[1]) ? d[0] : d[1]) - (isNaN(d[0]) ? 0 : d[0]);
                updateLabel(`${range} mention${range === 1 ? '' : 's'} (total: ${d.data._total})`);
            })
            .on('mouseout', function(event, d) {
                viz.colorCategory(d.data.label);
                if (viz.selected) {
                    const s = viz.barObjects[viz.selected][0][0];
                    const range = (isNaN(s[1]) ? s[0] : s[1]) - (isNaN(s[0]) ? 0 : s[0]);
                    updateLabel(`${range} mention${range === 1 ? '' : 's'} (total: ${s.data._total})`)

                    if (s.data.label !== d.data.label) {
                        // If statement to prevent flicker on hovering same category as selected
                        viz.onClick(s.data.label);
                    }
                }else {
                    viz.onClick(null);
                    updateLabel("") // Clear the label if no bar is selected
                }
            })
            .on('click', function(event, d) {
                viz.changeSelected(d.data.label);
            
                if (viz.selected) {
                    viz.onClick(d.data.label);
                } else {
                    viz.onClick(null);
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

    changeSelected(label) {
        const previouslySelected = this.selected;
        this.selected = this.selected === label ? null : label;

        if (label) {
            this.highlightCategory(label);
        }
        if (previouslySelected) {
            // Un-highlight the previously selected
            this.colorCategory(previouslySelected);
        }
    }

    colorCategory(label) {
        for (const [point, obj] of this.barObjects[label]) {
            d3.select(obj).style('fill', point.data.label === this.selected ? colors.hover : point[0] !== 0 ? colors.secondary : colors.default)
        }
    }

    highlightCategory(label) {
        for (const [_point, obj] of this.barObjects[label]) {
            d3.select(obj).style('fill', colors.hover)
        }
    }
}