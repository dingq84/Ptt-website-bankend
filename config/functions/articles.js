const Crawler = require("simplecrawler");
const { JSDOM } = require("jsdom");

function parser(dom) {
  const articlesDIVS = dom.window.document.querySelectorAll(".r-ent");
  const articles = [];
  articlesDIVS.forEach((articlesDIV) => {
    const { textContent: thread = "" } =
      articlesDIV.querySelector(".nrec > span") || {};
    const { textContent: title, href } = articlesDIV.querySelector(
      ".title > a"
    );
    const author = articlesDIV.querySelector(".meta > .author").textContent;
    const date = articlesDIV.querySelector(".meta > .date").textContent;

    // strapi.query("article").create({
    //   thread,
    //   title,
    //   href: href.split("/marvel/")[1].split(".html")[0],
    //   author,
    //   date,
    // });
    articles.push({
      thread,
      title,
      href: href.split("/marvel/")[1].split(".html")[0],
      author,
      date,
    });
  });

  return articles;
}

module.exports = async () => {
  const crawler = new Crawler("https://www.ptt.cc/bbs/marvel/index2435.html");

  crawler.maxDepth = 1; // Only first page is fetched (with linked CSS & images)
  crawler.downloadUnsupported = false;
  crawler.decodeResponses = true;

  crawler.addFetchCondition(function (queueItem) {
    return queueItem.path.match(/\/bbs\/marvel\/index\d{1,4}.html/);
  });

  crawler.on("fetchcomplete", function (queueItem, responseBuffer, response) {
    const dom = new JSDOM(responseBuffer.toString());
    const articles = parser(dom);
    console.log(articles);
  });

  crawler.on("complete", function () {
    console.log("complete");
  });

  crawler.start();
};
