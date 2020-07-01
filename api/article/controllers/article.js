"use strict";

function parser(dom) {
  const element = dom.window.document.getElementById("main-content");
  if (!element) {
    throw new Error("unknown element");
  }

  const { childNodes } = element;
  let i = 0;
  const data = { author: "", content: "" };
  while (i < childNodes.length) {
    if (i === 2) {
      const authorInfo = childNodes[i].querySelector(".article-meta-value")
        .textContent;
      data.author = authorInfo;
    }

    if (childNodes[i].nodeType === dom.window.Node.TEXT_NODE) {
      const { textContent } = childNodes[i];
      if (textContent.replace(/\n/gi, "").length) {
        data.content = textContent;
        break;
      }
    }
    i++;
  }

  return data;
}

async function getArticle(href) {
  const url = `https://www.ptt.cc/bbs/marvel/${href}.html`;
  return await strapi.config.functions.crawler(url, "", parser);
}
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async find(ctx) {
    const { page } = ctx.query;
    const newParams = { ...ctx.query };
    if (page) {
      delete newParams.page;
      newParams._start = (Number(page) - 1) * 10;
    }
    // Limit the data count
    newParams._limit = 10;
    const result = await strapi.services.article.find(newParams);

    return result.map((item) => ({
      title: item.title,
      author: item.author,
      date: item.date,
      articleId: item.id,
      thread: item.thread,
      isFavorited: item.users.some((user) => user.id === ctx.state.user.id),
    }));
  },
  async findOne(ctx) {
    const result = await strapi.services.article.findOne({ id: ctx.params.id });
    const content = await getArticle(result.href);

    return content;
  },
};
