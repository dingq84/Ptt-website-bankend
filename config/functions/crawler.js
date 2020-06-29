const Crawler = require("simplecrawler");
const { JSDOM } = require("jsdom");

module.exports = (url, fetchCondition, parser) => {
  return new Promise((resolve) => {
    let result;
    const crawler = new Crawler(url);
    crawler.maxDepth = 1; // Only first page is fetched (with linked CSS & images)
    crawler.downloadUnsupported = false;
    crawler.decodeResponses = true;

    crawler.addFetchCondition(function (queueItem) {
      console.log(queueItem);
      return queueItem.path.match(/\/bbs\/marvel\/index\d{1,4}.html/);
    });

    crawler.on("fetchcomplete", function (queueItem, responseBuffer, response) {
      const dom = new JSDOM(responseBuffer.toString());
      result = parser(dom);
    });

    crawler.on("complete", function () {
      console.log("complete");
      resolve(result);
    });

    crawler.start();
  });
};
