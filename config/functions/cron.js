"use strict";

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#cron-tasks
 */
let isRunning = false;
module.exports = {
  /**
   * Simple example.
   * Every monday at 1am.
   */
  // '0 1 * * 1': () => {
  //
  // }
  "*/10 * * * * *": () => {
    if (!isRunning) {
      isRunning = true;
      // strapi.config.functions.articles();
    }
    // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
  },
};
