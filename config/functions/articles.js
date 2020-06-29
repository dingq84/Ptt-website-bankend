function parser(dom) {
  const articlesDIVS = dom.window.document.querySelectorAll(".r-ent");
  const articles = [];
  articlesDIVS.forEach((articlesDIV) => {
    const { textContent: title = "", href } =
      articlesDIV.querySelector(".title > a") || {};

    const trimTitle = title.trim();
    if (!trimTitle || ["公告", "找文"].includes(title) || !href) {
      return;
    }

    const { textContent: thread = "" } =
      articlesDIV.querySelector(".nrec > span") || {};
    const author = articlesDIV
      .querySelector(".meta > .author")
      .textContent.trim();
    const date = articlesDIV.querySelector(".meta > .date").textContent.trim();

    strapi.query("article").create({
      thread,
      title,
      href: href.split("/marvel/")[1].split(".html")[0],
      author,
      date,
    });

    articles.push({
      thread,
      title: trimTitle,
      href: href.split("/marvel/")[1].split(".html")[0],
      author,
      date,
    });
  });

  return articles;
}

module.exports = async () => {
  const fetchCondition = (queueItem) =>
    queueItem.path.match(/\/bbs\/marvel\/index\d{1,4}.html/);

  const url = "https://www.ptt.cc/bbs/marvel/index2436.html";
  strapi.config.functions.crawler(url, fetchCondition, parser);
};
