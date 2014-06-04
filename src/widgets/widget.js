define([
  'jquery',
  'd3',
  'underscore',
  'base/class',
  'managers/events/events'
], function($, d3, _, Class, events) {

  var Widget = Class.extend({
    init: function(core, options) {
      this.name = this.name || options.name;
      this.state = this.state || options.state;
      this.placeholder = this.placeholder || options.placeholder;

      this.core = this.core || core;
      this.template = this.template || "widgets/widget";
      this.template_data = this.template_data || {
        name: this.name
      };
      // Markup to define where a Widget is going to be rendered.
      // Element which embodies the Widget
      this.element = this.element || null;
      this.widgets = this.widgets || {};

      this.layout = core.getInstance("layout");
      this.profiles = this.profiles || {};
      this.parent = parent;

      this.events = core.getInstance('events');
    },

    render: function(postRender) {
      var defer = $.Deferred();
      var _this = this;

      // First, we load the template
      var promise = this.loadTemplate();
      // After the template is loaded, load widgets
      promise.then(function() {
        
        if(_.isFunction(postRender)) postRender();

        //TODO: Chance of refactoring
        _this.resize();
        events.bind('resize', function() {
          _this.layout.update();
          _this.resize();
        });

        return _this.loadWidgets(); 
      })
      // After loading widgets, render them
      .then(function() {
        return _this.renderWidgets();
      })
      // After rendering the widgets, resolve the defer
      .done(function() {
        defer.resolve();
      });

      return defer;
    },

    loadWidgets: function(core) {
      var defer = $.Deferred();
      var defers = [];
      var _this = this;
      
      // Loops through widgets, loading them. 
      _.each(this.widgets, function(placeholder, widget) {
        var promise = _this.loadWidget(widget, placeholder);
        defers.push(promise);
      });

      // When all widgets have been successfully loaded, resolve the defer
      $.when.apply(null,defers).done(function() {
        defer.resolve();
      });

      return defer;
    },

    loadWidget: function(widget,placeholder) {
      var _this = this;
      var defer = $.Deferred();
      var path = "widgets/" + widget + "/" + widget;
      
      // Loads the file we need
      require([path], function(subwidget) {
        _this.widgets[widget] = new subwidget(_this.core, {
          name: widget,
          placeholder: placeholder,
          state: _this.state
        });

        // Resolve the defer after file has been loaded
        defer.resolve();
      });

      return defer;
    },

    renderWidgets: function() {
      var defer = $.Deferred();
      var defers = [];
      
      // Loops through widgets, rendering them. 
      _.each(this.widgets, function(widget) {
        defers.push(widget.render());
      });

      // After all widgets are rendered, resolve the defer
      $.when.apply(null, defers).done(function() {
        defer.resolve();
      });

      return defer;
    },

    loadTemplate: function() {
      var _this = this;
      var defer = $.Deferred();

      //require the template file
      require(["text!" + this.template + ".html"], function(html) {
        //render template using underscore
        var rendered = _.template(html, _this.template_data);

        //place the contents into the correct placeholder and define layout
        _this.placeholder = d3.select(_this.placeholder);
        _this.placeholder.html(rendered);
        _this.layout.setContainer(_this.placeholder);
        _this.layout.setProfile(_this.profiles);

        //Resolve defer
        defer.resolve();
      });

      return defer;
    },

    parent: function() {
      return this.parent;
    },

    setState: function(state) {
      this.state = _.extend(this.state, state);
      events.trigger('change:state', this.state);
      return this;
    },

    resize: function() {
      //what to do when page is resized
    }
  });


  return Widget;
});