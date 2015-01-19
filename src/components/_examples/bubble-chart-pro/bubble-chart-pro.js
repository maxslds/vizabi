define([
    'jquery',
    'd3',
    'base/component'
], function($, d3, Component) {

    function order(a, b) {
        return radius(b) - radius(a);
    }

    function radius(d, indicator){
        return d.pop;
    }

    var BubbleChart = Component.extend({
        init: function(context, options) {
            var _this = this;
            this.name = 'bubble-chart-pro';
            this.template = 'components/_examples/' + this.name + '/' + this.name;

            //define expected models for this component
            this.model_expects = ["time", "entities", "marker", "data"];

            this._super(context, options);

            this.xScale = null;
            this.yScale = null;
            this.rScale = null;
            this.cScale = d3.scale.category10();

            this.xAxis = d3.svg.axis();
            this.yAxis = d3.svg.axis();

            this.isDataPreprocessed = false;
            this.timeUpdatedOnce = false;
            this.sizeUpdatedOnce = false;

        },


        /**
         * Executes right after the template is in place
         */
        domReady: function() {
            var _this = this;

            // reference elements
            this.graph = this.element.select('.vzb-bc-graph');
            this.yAxisEl = this.graph.select('.vzb-bc-axis-y');
            this.xAxisEl = this.graph.select('.vzb-bc-axis-x');
            this.yTitleEl = this.graph.select('.vzb-bc-axis-y-title');
            this.xTitleEl = this.graph.select('.vzb-bc-axis-x-title');
            this.yearEl = this.graph.select('.vzb-bc-year');
            this.bubbleContainer = this.graph.select('.vzb-bc-bubbles');
            this.bubbles = null;
            this.tooltip = this.element.select('.vzb-tooltip');

            //model events
            this.model.on({
                "change": function(evt) {
                    console.log("Changed!", evt);
                },
                "load_start": function(evt) {
                    console.log("Started to load!", evt);
                },
                "load_end":  function() {
                    console.log("Finished loading!");
                },
                "ready": function() {
                    console.log("Model ready!");
//TODO: put here the following and remove it from "load_end" and from redrawDataPoints()
//                    _this.preprocessData();
//                    _this.updateShow();
//                    _this.updateTime();
//                    _this.redrawDataPoints();
                }
            });

            this.model.time.on({
                'change:value': function() {
                    _this.updateTime();
                    _this.redrawDataPoints();
                }
            });

            //component events
            this.on("resize", function() {
                console.log("Ops! Gotta resize...");
                _this.updateSize();
                _this.updateTime();
                _this.redrawDataPoints();
            })

        },

        preprocessData: function(){
            this.model.marker.label.getItems().forEach(function(d) {
                d["geo.region"] = d["geo.region"] || "world";
            });
            this.isDataPreprocessed = true;
        },


        /*
         * Updates the component as soon as the model/models change
         */
        modelReady: function(evt) {
            if (!this.isDataPreprocessed) this.preprocessData();
            this.updateShow();
            this.redrawDataPoints();
        },


        /*
         * UPDATE SHOW:
         * Ideally should only update when show parameters change or data changes
         */
        updateShow: function() {

            //scales
            this.yScale = this.model.marker.axis_y.getDomain();
            this.xScale = this.model.marker.axis_x.getDomain();
            this.rScale = this.model.marker.size.getDomain();

            var _this = this;
            this.yAxis.tickFormat(function(d) {
                return _this.model.marker.axis_y.getTick(d);
            });
            this.xAxis.tickFormat(function(d) {
                return _this.model.marker.axis_x.getTick(d);
            });

        },


        /*
         * UPDATE TIME:
         * Ideally should only update when time or data changes
         */
        updateTime: function() {
            var _this = this;
            this.time = this.model.time.value;

            this.data = this.model.marker.label.getItems({ time: this.time });


            this.yearEl.text(d3.time.format("%d %b")(this.time));
            this.bubbles = this.bubbleContainer.selectAll('.vzb-bc-bubble')
                .data(this.data);

            this.timeUpdatedOnce = true;
        },



        /*
         * RESIZE:
         * Executed whenever the container is resized
         */
        updateSize: function() {

            if (!this.isDataPreprocessed) return;

            var _this = this,
                margin,
                tick_spacing,
                maxRadius,
                minRadius,
                maxRadiusNormalized = this.model.marker.size.max,
                minRadiusNormalized = this.model.marker.size.min,
                padding = 2;

            switch (this.getLayoutProfile()) {
                case "small":
                    margin = {top: 30, right: 20, left: 40, bottom: 40};
                    tick_spacing = 60;
                    maxRadius = 20;
                    break;
                case "medium":
                    margin = {top: 30, right: 60, left: 60, bottom: 40};
                    tick_spacing = 80;
                    maxRadius = 40;
                    break;
                case "large":
                    margin = {top: 30, right: 60, left: 60, bottom: 40};
                    tick_spacing = 100;
                    maxRadius = 60;
                    break;
            }

            minRadius = maxRadius * minRadiusNormalized;
            maxRadius = maxRadius * maxRadiusNormalized;

            //stage
            var height = parseInt(this.element.style("height"), 10) - margin.top - margin.bottom;
            var width = parseInt(this.element.style("width"), 10) - margin.left - margin.right;

            //graph group is shifted according to margins (while svg element is at 100 by 100%)
            this.graph
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //center year
            var widthAxisY = this.yAxisEl[0][0].getBBox().width;
            var heightAxisX = this.xAxisEl[0][0].getBBox().height;

            this.yearEl
                .attr("x", "50%")
                .attr("y", "50%")
                .attr("transform", "translate(" + (-1 * widthAxisY) + ", " + (heightAxisX) + ")");

            //update scales to the new range
            if (this.model.marker.axis_y.scale !== "ordinal") {
                this.yScale.range([height, 0]).nice();
            } else {
                this.yScale.rangePoints([height, 0], padding).range();
            }
            if (this.model.marker.axis_x.scale !== "ordinal") {
                this.xScale.range([0, width]).nice();
            } else {
                this.xScale.rangePoints([0, width], padding).range();
            }
            if (this.model.marker.size.scale !== "ordinal") {
                this.rScale.range([minRadius, maxRadius]);
            } else {
                this.rScale.rangePoints([minRadius, maxRadius], 0).range();
            }

            //apply scales to axes and redraw
            this.yAxis.scale(this.yScale)
                .orient("left")
                .tickSize(6, 0)
                .ticks(Math.max(height / tick_spacing, 2));

            this.xAxis.scale(this.xScale)
                .orient("bottom")
                .tickSize(6, 0)
                .ticks(Math.max(width / tick_spacing, 2));

            this.xAxisEl.attr("transform", "translate(0," + height + ")");

            this.yAxisEl.call(this.yAxis);
            this.xAxisEl.call(this.xAxis);

            this.sizeUpdatedOnce = false;
        },

        /*
         * REDRAW DATA POINTS:
         * Here plotting happens
         */
        redrawDataPoints: function() {
            var _this = this;
            if(!this.timeUpdatedOnce) this.updateTime();
            if(!this.sizeUpdatedOnce) this.updateSize();

            //exit selection
            this.bubbles.exit().remove();

            //enter selection -- init circles
            this.bubbles.enter().append("circle")
                .attr("class", "vzb-bc-bubble");

            //update selection
            var speed = (this.model.time.playing) ? this.model.time.speed : 0;

            var some_selected = (_this.model.entities.select.length > 0);

            this.bubbles
                .style("fill", function(d) {
                    return _this.model.marker.color.getValue(d)||this.model.marker.color.domain[0];
                })
                .transition().duration(speed).ease("linear")
                .attr("cy", function(d) {
                    var value = _this.model.marker.axis_y.getValue(d)||_this.yScale.domain()[0];
                    return _this.yScale(value);
                })
                .attr("cx", function(d) {
                    var value = _this.model.marker.axis_x.getValue(d)||_this.xScale.domain()[0];
                    return _this.xScale(value);
                })
                .attr("r", function(d) {
                    var value = _this.model.marker.size.getValue(d)||_this.rScale.domain()[0];
                    return Math.sqrt(_this.rScale(value) / Math.PI) * 10;
                });

            this.bubbles.classed("vzb-bc-selected", function(d) {
                    return some_selected && _this.model.entities.isSelected(d)
                })
            this.bubbles.classed("vzb-bc-unselected", function(d) {
                    return some_selected && !_this.model.entities.isSelected(d)
                });

            /* TOOLTIP */
            //TODO: improve tooltip
            this.bubbles.on("mousemove", function(d, i) {
                    var mouse = d3.mouse(_this.graph.node()).map(function(d) {
                        return parseInt(d);
                    });

                    //position tooltip
                    _this.tooltip.classed("vzb-hidden", false)
                        .attr("style", "left:" + (mouse[0] + 50) + "px;top:" + (mouse[1] + 50) + "px")
                        .html(_this.model.marker.label.getValue(d));

                })
                .on("mouseout", function(d, i) {
                    _this.tooltip.classed("vzb-hidden", true);
                })
                .on("click", function(d, i) {
                    _this.model.entities.selectEntity(d);
                });
        }

    });

    return BubbleChart;
});






//
//
//
//        /*
//         * REDRAW DATA POINTS:
//         * Here plotting happens
//         */
//        redrawDataPoints: function() {
//            var _this = this;
//
//            //exit selection, removes circles that don't have data objects
//            this.bubbles.exit().remove();
//
//            //enter selection, creates new circles
//            this.bubbles.enter().append("circle").attr("class", "vzb-bc-bubble");
//
//            //update selection
//            this.bubbles
//                .style("fill", function(d) {
//                    return _this.cScale(d.region);
//                })
//                .attr("data-tooltip", function(d) {
//                    return d.key;
//                })
//                .attr("r", function(d) {
//                    return _this.rScale(d.now[_this.indicator[2]]||1);
//                })
//                // the following properties are updated with transition. radius can go down too
//                .transition().duration(this.playing?this.duration:0).ease("linear")
//                .attr("cy", function(d) {
//                    return _this.yScale(d.now[_this.indicator[0]]||1);
//                })
//                .attr("cx", function(d) {
//                    return _this.xScale(d.now[_this.indicator[1]]||1);
//                });
//
//            // Call flush() after any zero-duration transitions to synchronously flush the timer queue
//            // and thus make transition instantaneous. See https://github.com/mbostock/d3/issues/1951
//            d3.timer.flush();
//        },
//
//
//        /*
//         * RESIZE:
//         * Executed whenever the container is resized
//         */
//        resize: function() {
//            var _this = this;
//            var margin;
//            var tick_spacing;
//            var maxRadius;
//
//            switch (this.getLayoutProfile()) {
//                case "small":
//                    margin = {top: 30, right: 20, left: 40, bottom: 40};
//                    tick_spacing = 60;
//                    maxRadius = 30;
//                    break;
//                case "medium":
//                    margin = {top: 30, right: 60, left: 60, bottom: 40};
//                    tick_spacing = 80;
//                    maxRadius = 40;
//                    break;
//                case "large":
//                    margin = {top: 30, right: 60, left: 60, bottom: 40};
//                    tick_spacing = 100;
//                    maxRadius = 80;
//                    break;
//            }
//
//            //stage
//            var height = parseInt(this.element.style("height"), 10) - margin.top - margin.bottom;
//            var width = parseInt(this.element.style("width"), 10) - margin.left - margin.right;
//
//            //graph group is shifted according to margins (while svg element is at 100 by 100%)
//            this.graph
//                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//            //center year
//            var widthAxisY = this.yAxisEl[0][0].getBBox().width;
//            var heightAxisX = this.xAxisEl[0][0].getBBox().height;
//            this.yearEl
//                .attr("x", "50%")
//                .attr("y", "50%")
//                .attr("transform", "translate(" + (-1 * widthAxisY) + ", " + (heightAxisX) + ")");
//
//            //update scales to the new range
//            this.yScale.range([height, 0]).nice();
//            this.xScale.range([0, width]).nice();
//            this.rScale.range([1, maxRadius]);
//
//            //apply scales to axes and redraw
//            this.yAxis.scale(this.yScale)
//                .orient("left")
//                .tickSize(6, 0)
//                .ticks(Math.max(height / tick_spacing, 2))
//                //FIXME: for some reason .ticks() is not working for log scales. maybe d3 bug
//                .tickValues(this.scale[1] == "log"?[1, 5, 10, 50, 100, 500, 1000]:null);
//
//            this.xAxis.scale(this.xScale)
//                .orient("bottom")
//                .tickSize(6, 0)
//                .ticks(Math.max(width / tick_spacing, 2))
//                //FIXME: for some reason .ticks() is not working for log scales. maybe d3 bug
//                .tickValues(this.scale[0] == "log"?[1, 5, 10, 50, 100, 500, 1000]:null);
//
//
//            this.xAxisEl.attr("transform", "translate(0," + height + ")");
//
//            this.yAxisEl.call(this.yAxis);
//            this.xAxisEl.call(this.xAxis);
//
//            this.yTitleEl.text(this.indicator[1])
//                .attr("dx", "0.5em")
//                .attr("dy", "0.3em");
//            this.xTitleEl.text(this.indicator[0])
//                .attr("transform", "translate(" + width + "," + height + ")")
//                .attr("text-anchor", "end")
//                .attr("dy", "-0.5em");
//            this.rTitleEl.text("Size: " + this.indicator[2])
//                .attr("transform", "translate(" + width + "," + 0 + ") rotate(-90)")
//                .attr("text-anchor", "end")
//                .attr("dy", "0.3em");
//
//            this.redrawDataPoints();
//        },
//
//    });
//
