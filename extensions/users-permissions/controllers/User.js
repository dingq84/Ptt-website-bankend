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

    const data = sanitizeUser({
      articles: fullUser.articles.slice(start, start + 10).map((article) => ({
        ...article,
        isFavorited: true,
        articleId: article.id,
      })),
      count: fullUser.articles.length,
    });
    // const data = sanitizeUser(user);
    ctx.send(data);
  },
  /**
   * Update a/an user record.
   * @return {Object}
   */
  async update(ctx) {
    const advancedConfigs = await strapi
      .store({
        environment: "",
        type: "plugin",
        name: "users-permissions",
        key: "advanced",
      })
      .get();

    const { id } = ctx.params;
    const { email, username, password } = ctx.request.body;

    const user = await strapi.plugins["users-permissions"].services.user.fetch({
      id,
    });

    if (_.has(ctx.request.body, "email") && !email) {
      return ctx.badRequest("email.notNull");
    }

    if (_.has(ctx.request.body, "username") && !username) {
      return ctx.badRequest("username.notNull");
    }

    if (
      _.has(ctx.request.body, "password") &&
      !password &&
      user.provider === "local"
    ) {
      return ctx.badRequest("password.notNull");
    }

    if (_.has(ctx.request.body, "username")) {
      const userWithSameUsername = await strapi
        .query("user", "users-permissions")
        .findOne({ username });

      if (userWithSameUsername && userWithSameUsername.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.form.error.username.taken",
            message: "username.alreadyTaken.",
            field: ["username"],
          })
        );
      }
    }

    if (_.has(ctx.request.body, "email") && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi
        .query("user", "users-permissions")
        .findOne({ email });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.form.error.email.taken",
            message: "Email already taken",
            field: ["email"],
          })
        );
      }
    }

    let updateData = {
      ...ctx.request.body,
    };

    if (_.has(ctx.request.body, "password") && password === user.password) {
      delete updateData.password;
    }

    if (_.has(ctx.request.body, "articles")) {
      console.log(Object.entries(updateData.articles)[0]);
      const [articleId, isFavorited] = Object.entries(updateData.articles)[0];
      if (isFavorited) {
        const article = await strapi.services.article.findOne({
          id: Number(articleId),
        });
        updateData.articles = [...user.articles, article];
      } else {
        const { articles } = user;
        updateData.articles = articles.filter(
          (article) => article.id.toString() !== articleId
        );
      }
    }

    // console.log(updateData);
    const data = await strapi.plugins["users-permissions"].services.user.edit(
      { id },
      updateData
    );

    ctx.send(sanitizeUser(data));
  },
};
