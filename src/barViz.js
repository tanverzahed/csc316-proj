import * as d3 from "d3";
import {colors} from "./colors.js";

const defaultColors = {primary: colors.default, hover: colors.hover}

export class BarViz {
    constructor({data, getX, getY, dims, onClick, onHover, selected, colors=defaultColors}) {
        this.data = data;
        this.getX = getX;
        this.getY = getY;
        this.dims = dims;
        this.onClick = onClick;
        this.onHover = onHover;
        this.selected = selected;
        this.colors = colors
    }

    draw(svg) {
        const {data, getX, getY, dims, colors: {primary: primaryColor, hover: hoverColor}} = this;
        const viz = this;

        const {margin, width, height} = dims;
        viz.group = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");
        const g = viz.group;

        const {x, y} = getBarScales(data, {width, height, getX, getY});

        viz.xAxis = g.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));
        viz.xAxis
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        viz.yAxis = g.append("g")
            .call(d3.axisLeft(y)
                // Reduce labels to integers
                .tickFormat(integerFormat)
            );

        viz.barGroup = g.selectAll("rect");
        viz.bars = viz.barGroup
            .data(data)
            .enter()
            .append("rect")
            .attr("x", d => x(getX(d)))
            .attr("y", d => y(getY(d)))
            .attr("width", x.bandwidth())
            .attr("height", function (d) {
                return height - y(getY(d));
            })
            .style("fill", d => getX(d) === viz.selected ? hoverColor : primaryColor)
            .on('mouseover', function(event, d) {
                const bar = d3.select(this).style('fill', hoverColor)
                if (viz.onClick) {
                    bar.style('cursor', 'pointer');
                }
                if (viz.onHover) viz.onHover(d);
            })
            .on('mouseout', function(event, d) {
                const bar = d3.select(this).style('fill', viz.selected !== getX(d) ? primaryColor : hoverColor);
                if (viz.onClick) {
                    bar.style('cursor', 'default');
                }
                if (viz.onHover) viz.onHover();
            });
        if (viz.onClick) {
            viz.bars.on('click', (_, d) => {
                const selected = getX(d);
                if (selected === viz.selected) {
                    viz.selected = null;
                    viz.onClick(null);
                } else {
                    viz.selected = getX(d);
                    viz.onClick(d);
                }
                viz.update(viz.data)
            })
        }
    }

    update(data) {
        const {dims, getX, getY} = this;
        const viz = this;
        viz.data = data;

        const {width, height} = dims;
        const {x, y} = getBarScales(data, {width, height, getX, getY});

        this.xAxis.transition().duration(400).call(d3.axisBottom(x));

        this.yAxis.transition().duration(400).call(d3.axisLeft(y)
            .tickFormat(integerFormat)
        )

        const newData = viz.group.selectAll('rect')
            .data(data);
        newData
            .transition()
            .style("fill", d => getX(d) === viz.selected ? viz.colors.hover : viz.colors.primary)
            .attr("x", d => x(getX(d)))
            .attr("y", d => y(getY(d)))
            .attr("width", x.bandwidth())
            .attr("height", function (d) {
                return height - y(getY(d));
            })

        newData.exit().transition().attr('height', 0).remove();
    }

    highlightBar(x) {
        const viz = this;

        viz.group.selectAll('rect')
            .data(this.data)
            .transition().duration(0)
            .style("fill", d => this.getX(d) === x ? this.colors.hover : this.colors.primary)
    }
}

function integerFormat(e) {
    return e % 1 ? null : e
}

function getBarScales(data, {height, getY, width, getX}) {
    const y = d3.scaleLinear()
        .domain([0, d3.max(data.map(getY))])
        .range([height, 0]);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(getX))
        .padding(0.2);

    return {x, y}
}