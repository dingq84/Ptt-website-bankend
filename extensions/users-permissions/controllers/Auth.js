// https://talke.dev/strapi-user-permissions-jwt-cookies

const crypto = require("crypto");
const _ = require("lodash");
const grant = require("grant-koa");
const { sanitizeEntity } = require("strapi-utils");

const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  async callback(ctx) {
    const provider = ctx.params.provider || "local";
    const params = ctx.request.body;

    const store = await strapi.store({
      environment: "",
      type: "plugin",
      name: "users-permissions",
    });

    if (provider === "local") {
      if (!_.get(await store.get({ key: "grant" }), "email.enabled")) {
        return ctx.badRequest(null, "This provider is disabled.");
      }

      // The identifier is required.
      if (!params.identifier) {
        return ctx.badRequest(
          null,
          "Identifier or password invalid."
          // formatError({
          //   id: "Auth.form.error.email.provide",
          //   message: "Please provide your username or your e-mail.",
          // })
        );
      }

      // The password is required.
      if (!params.password) {
        return ctx.badRequest(
          null,
          "Identifier or password invalid."
          // formatError({
          //   id: "Auth.form.error.password.provide",
          //   message: "Please provide your password.",
          // })
        );
      }

      const query = { provider };

      // Check if the provided identifier is an email or not.
      const isEmail = emailRegExp.test(params.identifier);

      // Set the identifier to the appropriate query field.
      if (isEmail) {
        query.email = params.identifier.toLowerCase();
      } else {
        query.username = params.identifier;
      }

      // Check if the user exists.
      const user = await strapi
        .query("user", "users-permissions")
        .findOne(query);

      if (!user) {
        return ctx.badRequest(
          null,
          "Identifier or password invalid."
          // formatError({
          //   id: "Auth.form.error.invalid",
          //   message: "Identifier or password invalid.",
          // })
        );
      }

      if (
        _.get(await store.get({ key: "advanced" }), "email_confirmation") &&
        user.confirmed !== true
      ) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.form.error.confirmed",
            message: "Your account email is not confirmed",
          })
        );
      }

      if (user.blocked === true) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.form.error.blocked",
            message: "Your account has been blocked by an administrator",
          })
        );
      }

      // The user never authenticated with the `local` provider.
      if (!user.password) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.form.error.password.local",
            message:
              "This user never set a local password, please login with the provider used during account creation.",
          })
        );
      }

      const validPassword = strapi.plugins[
        "users-permissions"
      ].services.user.validatePassword(params.password, user.password);

      if (!validPassword) {
        return ctx.badRequest(
          null,
          "Identifier or password invalid."
          // formatError({
          //   id: "Auth.form.error.invalid",
          //   message: "Identifier or password invalid.",
          // })
        );
      } else {
        // ctx.send({
        //   jwt: strapi.plugins["users-permissions"].services.jwt.issue({
        //     id: user.id,
        //   }),
        //   user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
        //     model: strapi.query("user", "users-permissions").model,
        //   }),
        // });
        const jwtToken = strapi.plugins["users-permissions"].services.jwt.issue(
          {
            id: user.id,
          }
        );

        await new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 2000);
        });
        ctx.cookies.set("token", jwtToken, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 365,
          secure: process.env.NODE_ENV === "production" ? true : false,
          domain: "localhost",
        });

        ctx.send({
          status: "Authenticated",
          user: sanitizeEntity(
            {
              username: user.username,
              email: user.email,
              userId: user.id,
              articles: user.articles,
            },
            {
              model: strapi.query("user", "users-permissions").model,
            }
          ),
          // user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
          //   model: strapi.query("user", "users-permissions").model,
          // }),
        });
      }
    } else {
      if (!_.get(await store.get({ key: "grant" }), [provider, "enabled"])) {
        return ctx.badRequest(
          null,
          formatError({
            id: "provider.disabled",
            message: "This provider is disabled.",
          })
        );
      }

      // Connect the user with the third-party provider.
      let user, error;
      try {
        [user, error] = await strapi.plugins[
          "users-permissions"
        ].services.providers.connect(provider, ctx.query);
      } catch ([user, error]) {
        return ctx.badRequest(null, error === "array" ? error[0] : error);
      }

      if (!user) {
        return ctx.badRequest(null, error === "array" ? error[0] : error);
      }

      const jwtToken = strapi.plugins["users-permissions"].services.jwt.issue({
        id: user.id,
      });

      ctx.cookies.set("token", jwtToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
        secure: process.env.NODE_ENV === "production" ? true : false,
        domain: "localhost",
      });

      ctx.send({
        status: "Authenticated",
        user: sanitizeEntity(
          {
            username: user.username,
            email: user.email,
            userId: user.id,
            articles: user.articles,
          },
          {
            model: strapi.query("user", "users-permissions").model,
          }
        ),
        // user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
        //   model: strapi.query("user", "users-permissions").model,
        // }),
      });
    }
  },
  async register(ctx) {
    const pluginStore = await strapi.store({
      environment: "",
      type: "plugin",
      name: "users-permissions",
    });

    const settings = await pluginStore.get({
      key: "advanced",
    });

    if (!settings.allow_register) {
      return ctx.badRequest(
        null,
        "Register action is currently disabled."
        // formatError({
        //   id: 'Auth.advanced.allow_register',
        //   message: 'Register action is currently disabled.',
        // })
      );
    }

    const params = {
      ..._.omit(ctx.request.body, ["confirmed", "resetPasswordToken"]),
      provider: "local",
    };

    // Password is required.
    if (!params.password) {
      return ctx.badRequest(
        null,
        "Please provide your password."
        // formatError({
        //   id: 'Auth.form.error.password.provide',
        //   message: 'Please provide your password.',
        // })
      );
    }

    // Email is required.
    if (!params.email) {
      return ctx.badRequest(
        null,
        "Please provide your email."
        // formatError({
        //   id: 'Auth.form.error.email.provide',
        //   message: 'Please provide your email.',
        // })
      );
    }

    // Throw an error if the password selected by the user
    // contains more than two times the symbol '$'.
    if (
      strapi.plugins["users-permissions"].services.user.isHashed(
        params.password
      )
    ) {
      return ctx.badRequest(
        null,
        "Your password cannot contain more than three times the symbol `$`."
        // formatError({
        //   id: 'Auth.form.error.password.format',
        //   message: 'Your password cannot contain more than three times the symbol `$`.',
        // })
      );
    }

    const role = await strapi
      .query("role", "users-permissions")
      .findOne({ type: settings.default_role }, []);

    if (!role) {
      return ctx.badRequest(
        null,
        "Impossible to find the default role."
        // formatError({
        //   id: 'Auth.form.error.role.notFound',
        //   message: 'Impossible to find the default role.',
        // })
      );
    }

    // Check if the provided email is valid or not.
    const isEmail = emailRegExp.test(params.email);

    if (isEmail) {
      params.email = params.email.toLowerCase();
    } else {
      return ctx.badRequest(
        null,
        "Please provide valid email address."
        // formatError({
        //   id: 'Auth.form.error.email.format',
        //   message: 'Please provide valid email address.',
        // })
      );
    }

    params.role = role.id;
    params.password = await strapi.plugins[
      "users-permissions"
    ].services.user.hashPassword(params);

    const user = await strapi.query("user", "users-permissions").findOne({
      email: params.email,
    });

    if (user && user.provider === params.provider) {
      return ctx.badRequest(
        null,
        "Email is already taken."
        // formatError({
        //   id: 'Auth.form.error.email.taken',
        //   message: 'Email is already taken.',
        // })
      );
    }

    if (user && user.provider !== params.provider && settings.unique_email) {
      return ctx.badRequest(
        null,
        "Email is already taken."
        // formatError({
        //   id: 'Auth.form.error.email.taken',
        //   message: 'Email is already taken.',
        // })
      );
    }

    try {
      if (!settings.email_confirmation) {
        params.confirmed = true;
      }

      const user = await strapi
        .query("user", "users-permissions")
        .create(params);

      const jwt = strapi.plugins["users-permissions"].services.jwt.issue(
        _.pick(user.toJSON ? user.toJSON() : user, ["id"])
      );

      if (settings.email_confirmation) {
        const settings = await pluginStore
          .get({ key: "email" })
          .then((storeEmail) => {
            try {
              return storeEmail["email_confirmation"].options;
            } catch (error) {
              return {};
            }
          });

        settings.message = await strapi.plugins[
          "users-permissions"
        ].services.userspermissions.template(settings.message, {
          URL: `${strapi.config.server.url}/auth/email-confirmation`,
          USER: _.omit(user.toJSON ? user.toJSON() : user, [
            "password",
            "resetPasswordToken",
            "role",
            "provider",
          ]),
          CODE: jwt,
        });

        settings.object = await strapi.plugins[
          "users-permissions"
        ].services.userspermissions.template(settings.object, {
          USER: _.omit(user.toJSON ? user.toJSON() : user, [
            "password",
            "resetPasswordToken",
            "role",
            "provider",
          ]),
        });

        try {
          // Send an email to the user.
          await strapi.plugins["email"].services.email.send({
            to: (user.toJSON ? user.toJSON() : user).email,
            from:
              settings.from.email && settings.from.name
                ? `${settings.from.name} <${settings.from.email}>`
                : undefined,
            replyTo: settings.response_email,
            subject: settings.object,
            text: settings.message,
            html: settings.message,
          });
        } catch (err) {
          return ctx.badRequest(null, err);
        }
      }

      const sanitizedUser = sanitizeEntity(user.toJSON ? user.toJSON() : user, {
        model: strapi.query("user", "users-permissions").model,
      });
      if (settings.email_confirmation) {
        ctx.send({
          user: sanitizedUser,
        });
      } else {
        // ctx.send({
        //   jwt,
        //   user: sanitizedUser,
        // });
        ctx.cookies.set("token", jwt, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 365,
          secure: process.env.NODE_ENV === "production" ? true : false,
          domain: "localhost",
        });
        ctx.send({
          status: "Authenticated",
          user: sanitizeEntity(
            {
              username: user.username,
              email: user.email,
              userId: user.id,
              articles: user.articles,
            },
            {
              model: strapi.query("user", "users-permissions").model,
            }
          ),
          // user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
          //   model: strapi.query("user", "users-permissions").model,
          // }),
        });
      }
    } catch (err) {
      const adminError = _.includes(err.message, "username")
        ? {
            id: "Auth.form.error.username.taken",
            message: "Username already taken",
          }
        : { id: "Auth.form.error.email.taken", message: "Email already taken" };

      ctx.badRequest(
        null,
        // formatError(adminError)
        adminError.message
      );
    }
  },
};
