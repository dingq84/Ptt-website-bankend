"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async logout(ctx) {
    ctx.cookies.set("token");
    ctx.cookies.set("token.sig");
    ctx.send({
      authorized: true,
      message: "Successfully destroyed session",
    });
  },
};
