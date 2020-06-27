// Override the basic settings
// https://strapi.io/documentation/v3.x/concepts/middlewares.html#configuration-and-activation
module.exports = (strapi) => {
  return {
    settings: {
      cors: {
        origin: "http://localhost:3000",
      },
    },
  };
};
