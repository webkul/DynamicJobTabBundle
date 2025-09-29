'use strict';
/**
 * Newtab form
 */
define([
  'underscore',
  'oro/translator',
  'dynamic/template/export/common/edit/newtab',
  'pim/common/tab',
  'pim/common/property',
  'pim/edition',
  'pim/fetcher-registry',
], function (_, __, template, BaseTab, propertyAccessor, pimEdition, FetcherRegistry) {
  return BaseTab.extend({
    template: _.template(template),
    errors: {},
    jobInstanceCode: null, // Store job instance code locally

    /**
     * {@inherit}
     */
    configure: function () {
      // Using arrow functions for listeners automatically binds `this`, making the code cleaner.
      this.listenTo(this.getRoot(), 'pim_enrich:form:entity:post_fetch', (data) => {
        // IMPROVEMENT 1: Get data directly from the form model instead of the URL.
        // This is more reliable and decouples the component from the URL structure.
        this.jobInstanceCode = data.code || null;
        this.resetValidationErrors();
        this.render();
      });

      this.listenTo(this.getRoot(), 'pim_enrich:form:entity:validation_error', (event) => {
        this.setValidationErrors(event);
        this.render();
      });

      return BaseTab.prototype.configure.apply(this, arguments);
    },

    /**
     * {@inherit}
     */
    registerTab: function () {
      // Exit early if the job instance code is not available.
      if (!this.jobInstanceCode) {
        return;
      }

      FetcherRegistry.getFetcher('job_code_by_instance_code')
        .fetch(this.jobInstanceCode, { cached: true })
        // IMPROVEMENT 2: Use an arrow function to avoid needing `.bind(this)`.
        .then((jobCode) => {
          // Use `includes` for better readability than `indexOf`.
          if (this.config.whitelistJobs.includes(jobCode)) {
            this.trigger('tab:register', {
              code: this.config.tabCode ? this.config.tabCode : this.code,
              label: __(this.config.tabTitle),
              // This arrow function for isVisible is already well-written.
              isVisible: () => !(this.config.hideForCloudEdition && pimEdition.isCloudEdition()),
            });
          }
        });
    },

    /**
     * NOTE: The getJobInstanceCode method has been removed.
     * Relying on `window.location.href` was fragile. If the URL routing ever changed,
     * the code would break. We now get the code directly from the form's data model
     * in the `configure` method, which is much safer.
     */

    /**
     * Set validation errors after save request failure
     *
     * @param {object} event
     */
    setValidationErrors: function (event) {
      this.errors = event.response || {};
    },

    /**
     * Remove validation errors.
     */
    resetValidationErrors: function () {
      // IMPROVEMENT 3: The original condition `Object.entries(this.errors).length >= 0`
      // would always be true. This new condition correctly checks if there are any errors.
      if (Object.keys(this.errors).length > 0) {
        this.getRoot().trigger('pim_enrich:form:form-tabs:remove-errors');
        this.errors = {};
      }
    },

    /**
     * Get the validation errors for the given field.
     *
     * @param {string} field
     *
     * @return {mixed}
     */
    getValidationErrorsForField: function (field) {
      return propertyAccessor.accessProperty(this.errors, field, null);
    },

    /**
     * {@inherit}
     */
    render: function () {
      if (!this.configured) {
        return this;
      }

      this.$el.html(this.template({ __: __ }));
      this.renderExtensions();

      return this; // It's good practice for render to return `this`.
    },
  });
});
