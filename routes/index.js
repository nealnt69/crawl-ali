const axios = require("axios");
var express = require("express");
const jsdom = require("jsdom");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { JSDOM } = jsdom;
const HttpsProxyAgent = require("https-proxy-agent");

var router = express.Router();

router.get("/crawl", async (req, res) => {
  let listUrl = [];
  let detailProducts = [];
  let stopLogin = 1;
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    slowMo: 1,
  });

  const page = await browser.newPage();
  await page.goto(
    `https://trade.aliexpress.com/order_detail.htm?orderId=9999`,
    {
      waitUntil: "domcontentloaded",
    }
  );
  while (stopLogin > 0) {
    await page.click("#fm-login-id");
    await page.type("#fm-login-id", "namnt691997@gmail.com");
    await page.click("#fm-login-password");
    await page.waitForTimeout(3000);
    let checkCode = await page.$eval(
      ".fm-checkcode",
      (el) => el?.style?.display || ""
    );
    if (checkCode === "block") {
      await page.reload();
    } else {
      stopLogin = 0;
    }
  }
  await page.type("#fm-login-password", "namnguyen691997");
  await page.click("button[type='submit']");
  await page.waitForNavigation();
  res.status(200).json();
  await page.goto(
    "https://www.aliexpress.com/store/all-wholesale-products/432780.html",
    {
      waitUntil: "domcontentloaded",
    }
  );
  let stop = 0;
  let index = 1;
  while (stop < 1) {
    console.log(index);
    await page.waitForTimeout(2000);
    await wait(2000);
    await autoScroll(page);
    const itemLink = await page.evaluate(() => {
      let listLink = [];
      let elements = document.getElementsByClassName("pic-rind");
      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        listLink.push(element.getAttribute("href"));
      }
      return listLink;
    });
    index++;
    listUrl = [...listUrl, ...itemLink];
    let convertListUrl = itemLink.map(
      (item) =>
        "https://aliexpress" +
        item.split("aliexpress")[item.split("aliexpress").length - 1]
    );
    const subArrCount = Math.ceil(convertListUrl.length / 2);

    let subArrUrl = [];

    for (let i = 1; i <= subArrCount; i++) {
      subArrUrl.push(convertListUrl.slice(2 * (i - 1), 2 * i));
    }

    while (subArrUrl.length > 0) {
      for (let index = 0; index < subArrUrl.length; index++) {
        const urls = subArrUrl[index];
        try {
          const products = await Promise.all(
            urls.map((url) => crawlProduct(url))
          );
          if (!products) {
            console.log(products);
          }
          console.log(index);
          detailProducts = [...detailProducts, ...products];
          if (index === subArrUrl.length - 1) {
            subArrUrl = [];
          }
        } catch (error) {
          console.log(error.config.url);
          subArrUrl = subArrUrl.slice(index + 1);
          // subArrUrl = [
          //   ...subArrUrl.slice(0, index),
          //   subArrUrl[index].filter((item) => item != error.config.url),
          //   ...subArrUrl.slice(index + 1),
          // ];
          await wait(2000);
          break;
        }
      }
    }
    let checkStop = await page.evaluate(() =>
      document.querySelector(
        "[class='ui-pagination-next ui-pagination-disabled']"
      )
    );
    if (checkStop) {
      stop++;
      break;
    } else {
      console.log(itemLink);
      await page.click(".ui-pagination-next");
    }
  }

  console.log("done");
  await browser.close();
});

router.get("/single", async (req, res) => {
  const data = await crawlProduct(
    "https://aliexpress.com/item/4000912998216.html?spm=a2g0o.ams_97944.topranking.2.6620bGQlbGQl7r&scm=1007.26694.226824.0&scm_id=1007.26694.226824.0&scm-url=1007.26694.226824.0&pvid=56d17034-c7a4-4285-ad19-e0fbbbbcc2e2&fromRankId=4500689&_t=fromRankId:4500689"
  );
  console.log(data);
  res.status(200).json("ok");
});

const wait = (timeToDelay) =>
  new Promise((resolve) => setTimeout(resolve, timeToDelay));

const crawlProduct = async (url) => {
  try {
    const html = (await axios(url)).data;
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
    });

    const data = dom.window.runParams.data;
    const sku = data.commonModule.productId;
    const title = data.titleModule.subject;
    let description = "";
    const linkDescription = data.descriptionModule.descriptionUrl;
    const htmlDescription = (await axios(linkDescription)).data;
    const $ = cheerio.load(htmlDescription);
    const textP = $("p[class*='detail']");
    const textSpan = $("span[style]");
    if (textP.length > 0) {
      for (let index = 0; index < textP.length; index++) {
        const element = $(textP[index]);
        let textPHtml = element.html();
        description = description
          .concat(textPHtml.slice(0).replace(/<br>/gm, "\n"))
          .concat("\n");
      }
    }
    if (textSpan.length > 0) {
      for (let index = 0; index < textSpan.length; index++) {
        const element = $(textSpan[index]);
        let textSpanHtml = element.html();
        description = description
          .concat(textSpanHtml.slice(0).replace(/<br>/gm, "\n"))
          .concat("\n");
      }
    }
    const ortherImage = data.imageModule.imagePathList;
    const productSKUPropertyList = data.skuModule.productSKUPropertyList;
    const productSKUPriceList = data.skuModule.skuPriceList;
    let childrenSku = [];
    if (productSKUPropertyList) {
      switch (productSKUPropertyList.length) {
        case 1:
          childrenSku = getChildreFromOneSku(
            productSKUPropertyList,
            productSKUPriceList
          );
          break;
        case 2:
          childrenSku = getChildreFromTwoSku(
            productSKUPropertyList,
            productSKUPriceList
          );
          break;
        case 3:
          childrenSku = getChildreFromThreeSku(
            productSKUPropertyList,
            productSKUPriceList
          );
          break;
        default:
          break;
      }
    } else {
      childrenSku = [
        {
          proIds: ``,
          image: "",
          price:
            productSKUPriceList[0].skuVal.actSkuCalPrice ||
            productSKUPriceList[0].skuVal.skuCalPrice ||
            0,
          qty: productSKUPriceList[0].skuVal.availQuantity || 0,
          type: "single",
        },
      ];
    }
    childrenSku = filter(childrenSku);
    return {
      sku,
      title,
      description,
      ortherImage,
      childrenSku,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getChildreFromOneSku = (productSKUPropertyList, productSKUPriceList) => {
  let arr = [];
  const pro1 = productSKUPropertyList[0];
  const proName1 = pro1.skuPropertyName;
  for (let i = 0; i < pro1.skuPropertyValues.length; i++) {
    const element1 = pro1.skuPropertyValues[i];
    arr.push({
      [proName1]: element1.propertyValueDisplayName,
      proIds: `${element1.propertyValueIdLong}`,
      image: element1.skuPropertyImagePath,
      price:
        productSKUPriceList.find(
          (price) => price.skuPropIds == `${element1.propertyValueIdLong}`
        )?.skuVal?.actSkuCalPrice ||
        productSKUPriceList.find(
          (price) => price.skuPropIds == `${element1.propertyValueIdLong}`
        )?.skuVal?.skuCalPrice ||
        0,
      qty:
        productSKUPriceList.find(
          (price) => price.skuPropIds == `${element1.propertyValueIdLong}`
        )?.skuVal?.availQuantity || 0,
    });
  }
  return arr;
};

const getChildreFromTwoSku = (productSKUPropertyList, productSKUPriceList) => {
  let arr = [];
  const pro1 = productSKUPropertyList[0];
  const proName1 = pro1.skuPropertyName;
  const pro2 = productSKUPropertyList[1];
  const proName2 = pro2.skuPropertyName;
  for (let i = 0; i < pro1.skuPropertyValues.length; i++) {
    const element1 = pro1.skuPropertyValues[i];
    for (let j = 0; j < pro2.skuPropertyValues.length; j++) {
      const element2 = pro2.skuPropertyValues[j];
      arr.push({
        [proName1]: element1.propertyValueDisplayName,
        [proName2]: element2.propertyValueDisplayName,
        proIds: `${element1.propertyValueIdLong},${element2.propertyValueIdLong}`,
        image: element1.skuPropertyImagePath || element2.skuPropertyImagePath,
        price:
          productSKUPriceList.find(
            (price) =>
              price.skuPropIds ==
              `${element1.propertyValueIdLong},${element2.propertyValueIdLong}`
          )?.skuVal?.actSkuCalPrice ||
          productSKUPriceList.find(
            (price) =>
              price.skuPropIds ==
              `${element1.propertyValueIdLong},${element2.propertyValueIdLong}`
          )?.skuVal?.skuCalPrice ||
          0,
        qty:
          productSKUPriceList.find(
            (price) =>
              price.skuPropIds ==
              `${element1.propertyValueIdLong},${element2.propertyValueIdLong}`
          )?.skuVal?.availQuantity || 0,
      });
    }
  }
  return arr;
};

const getChildreFromThreeSku = (
  productSKUPropertyList,
  productSKUPriceList
) => {
  let arr = [];
  const pro1 = productSKUPropertyList[0];
  const proName1 = pro1.skuPropertyName;
  const pro2 = productSKUPropertyList[1];
  const proName2 = pro2.skuPropertyName;
  const pro3 = productSKUPropertyList[2];
  const proName3 = pro3.skuPropertyName;
  for (let i = 0; i < pro1.skuPropertyValues.length; i++) {
    const element1 = pro1.skuPropertyValues[i];
    for (let j = 0; j < pro2.skuPropertyValues.length; j++) {
      const element2 = pro2.skuPropertyValues[j];
      for (let k = 0; k < pro3.skuPropertyValues.length; k++) {
        const element3 = pro3.skuPropertyValues[k];
        arr.push({
          [proName1]: element1.propertyValueDisplayName,
          [proName2]: element2.propertyValueDisplayName,
          [proName3]: element3.propertyValueDisplayName,
          proIds: `${element1.propertyValueIdLong},${element2.propertyValueIdLong},${element3.propertyValueIdLong}`,
          image:
            element1.skuPropertyImagePath ||
            element2.skuPropertyImagePath ||
            element3.skuPropertyImagePath,
          price:
            productSKUPriceList.find(
              (price) =>
                price.skuPropIds ==
                `${element1.propertyValueIdLong},${element2.propertyValueIdLong},${element3.propertyValueIdLong}`
            )?.skuVal?.actSkuCalPrice ||
            productSKUPriceList.find(
              (price) =>
                price.skuPropIds ==
                `${element1.propertyValueIdLong},${element2.propertyValueIdLong},${element3.propertyValueIdLong}`
            )?.skuVal?.skuCalPrice ||
            0,
          qty:
            productSKUPriceList.find(
              (price) =>
                price.skuPropIds ==
                `${element1.propertyValueIdLong},${element2.propertyValueIdLong},${element3.propertyValueIdLong}`
            )?.skuVal?.availQuantity || 0,
        });
      }
    }
  }
  return arr;
};

const filter = (list) => {
  return list.filter((item) => {
    if (item["Ships From"]) {
      return (
        (item["Ships From"] == "United States" ||
          item["Ships From"] == "US" ||
          item["Ships From"] == "Hoa Kỳ") &&
        item.qty > 0
      );
    }
    return item.qty > 0;
  });
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 1000;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - 1500) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

module.exports = router;
