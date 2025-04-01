import * as d3 from 'd3';
import cloud from "d3-cloud";

const colors = {
    default: '#69b3a2',
    secondary: '#278872',
    selected: '#ff7d12',
    hover: '#ff7d12',
}


/**
 * @typedef {Object} Word
 * @property {string} word
 * @property {number} size
 */


export class WordCloud {
    /**
     * @param parentElementId
     * @param words {Word[]}
     */
    constructor(parentElementId, words, {width, height}, onHover) {
        this.parentElementId = parentElementId;
        this.words = words;
        this.margin = {top: 10, right: 10, bottom: 10, left: 10};
        this.width = width - this.margin.left - this.margin.right;
        this.height = height - this.margin.top - this.margin.bottom;
        this.onHover = onHover;
    }

    initVis() {
        const vis = this;

        // set the dimensions and margins of the graph
        const {margin, width, height} = this;

        // append the svg object to the body of the page
        vis.svg = d3.select("#" + vis.parentElementId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Constructs a new cloud layout instance. It run an algorithm to find the position of words that suits your requirements
        // Wordcloud features that are different from one word to the other must be here
        var layout = cloud()
            .size([width, height])
            .words(vis.words.map(function(d) { return {text: d.word, size:d.size}; }))
            .padding(5)        //space between words
            .rotate(function() { return ~~(Math.random() * 6 - 3) * 30; })
            .fontSize(function(d) { return d.size; })      // font size of words
            .on("end", draw);
        layout.start();

        const dataByWord = Object.fromEntries(vis.words.map(d => [d.word, d]));

        // This function takes the output of 'layout' above and draw the words
        // Wordcloud features that are THE SAME from one word to the other can be here
        function draw(words) {
            vis.layoutWords = words;
            vis.svg
                .append("g")
                .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
                .selectAll("text")
                .data(words)
                .enter().append("text")
                .style("font-size", function(d) { return d.size; })
                .style("fill", colors.default)
                .attr("text-anchor", "middle")
                .style("font-family", "Impact")
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .on('mouseover', function(_e, d) {
                    d3.select(this).style('fill', colors.hover)
                    vis.onHover(dataByWord[d.text]);
                })
                .on('mouseout', function() {
                    d3.select(this).style('fill', colors.default);
                    vis.onHover();
                })
                .text(function(d) { return d.text; });
        }
    }

    highlightWord(word) {
        const vis = this;

        vis.svg
            .selectAll("text")
            .data(vis.layoutWords).transition().duration(0)
            .style("fill", d => {
                return d.text === word ? colors.hover : colors.default
            })
    }
    
}