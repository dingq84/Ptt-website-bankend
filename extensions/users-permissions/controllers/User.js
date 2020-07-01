"use strict";

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");

const sanitizeUser = (user) =>
  sanitizeEntity(user, {
    model: strapi.query("user", "users-permissions").model,
  });

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  /**
   * Retrieve authenticated user.
   * @return {Object|Array}
   */
  async me(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [
        { messages: [{ id: "No authorization header was found" }] },
      ]);
    }

    const fullUser = await strapi.plugins[
      "users-permissions"
    ].services.user.fetch({
      id: user.id,
    });
    const { page = 1 } = ctx.query;

    const start = page < 1 ? 0 : (Number(page) - 1) * 10;

    // const data = sanitizeUser({
    //   articles: fullUser.articles
    //     .slice(start, start + 10)
    //     .map((article) => ({ ...article, isFavorited: true })),
    //   count: fullUser.articles.length,
    // });
    const data = sanitizeUser(user);
    ctx.send(data);
  },
};
