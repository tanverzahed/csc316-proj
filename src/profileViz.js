import * as d3 from "d3";
import { BarViz } from "./barViz.js";

export class ProfileViz {
    constructor({ parentElement, profile, onClick, selected, localLocationData }) {
        this.parentElement = parentElement;
        this.profile = profile;
        this.onClick = onClick;
        this.selected = selected;
        this.localLocationData = localLocationData;
        console.log(this.localLocationData);
    }

    // Default bar graph dimensions
    defaultBarGraphDimensions() {
        const margin = { top: 30, right: 30, bottom: 70, left: 60 },
            width = 460 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        return { margin, width, height };
    }

    // Add bar visualization to the SVG
    async addVis43ToSvg(svg, targetPerson, dims, selected, onClick) {
        const localLocationData = this.localLocationData;

        const categoryCounts = {};
        localLocationData
            .filter(({ Person: person }) => person === targetPerson)
            .forEach(({ location: { category } }) => {
                categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
            });

        const categories = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
        console.log(categories);
        const barViz = new BarViz({
            data: categories,
            getX: (d) => d.category,
            getY: (d) => d.count,
            dims,
            selected,
            onClick,
        });

        barViz.draw(svg);
        return barViz;
    }

    async render() {
        const svg = d3.select(this.parentElement)
            .append("svg")
            .attr("width", "100%");

        const title = svg.append("text")
            .text(this.profile.Person)
            .attr("y", 30)
            .attr("class", "text-2xl");
        const titleBbox = title.node().getBBox();

        const subtext = svg.append("text")
            .text(`Lived in Toronto for ${this.profile.length_in_toronto} years.`)
            .attr("y", +title.attr("y") + titleBbox.height - 8)
            .attr("class", "text-lg");
        const subtextBbox = subtext.node().getBBox();

        const contentWidth = svg.node().getBoundingClientRect().width;
        let baseY = +subtext.attr("y") + subtextBbox.height + 8;
        const descriptionLines = [svg.append("text").attr("y", baseY)];
        this.profile.description.split(" ").forEach((word) => {
            const currentLine = descriptionLines[descriptionLines.length - 1];
            const oldText = currentLine.text();
            currentLine.text(`${oldText} ${word}`);
            if (currentLine.node().getComputedTextLength() > contentWidth) {
                currentLine.text(oldText);
                baseY += currentLine.node().getBBox().height;
                descriptionLines.push(svg.append("text").attr("y", baseY).text(word));
            }
        });

        const lastLine = descriptionLines[descriptionLines.length - 1];
        const lastLineBottom = +lastLine.attr("y") + lastLine.node().getBBox().height;
        const dims = this.defaultBarGraphDimensions();
        const barGraphSvg = svg.append("g").attr("transform", `translate(0, ${lastLineBottom})`);
        const barGraphTitle = barGraphSvg.append("text")
            .text(`Categories mentioned by ${this.profile.Person}`)
            .attr("y", 10)
            .attr("class", "text-lg");
        barGraphTitle.attr("x", (contentWidth - barGraphTitle.node().getComputedTextLength()) / 2);

        this.barViz = await this.addVis43ToSvg(barGraphSvg, this.profile.Person, dims, this.selected, this.onClick);

        svg.attr("height", lastLineBottom + barGraphSvg.node().getBBox().height);
    }

    highlightBar(x) {
        this.barViz.highlightBar(x);
    }
}