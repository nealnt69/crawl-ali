const axios = require("axios");
var express = require("express");
const jsdom = require("jsdom");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { JSDOM } = jsdom;
const mongoose = require("mongoose");
const storeModel = require("../db/schema/store");
const productModel = require("../db/schema/product");
const moment = require("moment");
const XLSX = require("xlsx");

var router = express.Router();

let isCrawling = false;

router.get("/", async (req, res) => {
  const listCrawl = await storeModel.find().sort({ created_at: -1 }).limit(30);
  res.render("index", {
    title: "Crawl Ali",
    listCrawl,
    moment: moment,
    isCrawling,
  });
});

router.get("/download", async (req, res) => {
  const { id } = req.query;
  const store = await storeModel.findById(id).lean();
  const products = await productModel.find({ store: id });
  res.status(200).json({ store, products });
});

router.post("/crawl", async (req, res) => {
  const { url, ship, num, prefix, length } = req.body;
  const id = mongoose.Types.ObjectId();
  let listUrl = [];
  let detailProducts = [];
  isCrawling = true;
  let stopLogin = 1;
  const browser = await puppeteer.launch({
    headless: true,
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
  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });
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
    let skip = 0;
    while (subArrUrl.length > 0) {
      for (let i = 0; i < subArrUrl.length; i++) {
        const urls = subArrUrl[i];
        try {
          const products = await Promise.all(
            urls.map((url) => crawlProduct(url))
          );
          if (!products) {
            console.log(products);
          }
          console.log(i);
          skip = 0;
          detailProducts = [...detailProducts, ...products];
          if (i === subArrUrl.length - 1) {
            subArrUrl = [];
          }
        } catch (error) {
          if (skip === 0) {
            console.log(error?.config?.url);
            subArrUrl = subArrUrl.slice(i);
            skip++;
            await wait(5000);
            break;
          } else {
            if (skip === 3) {
              subArrUrl = [];
            } else {
              subArrUrl = subArrUrl.slice(i + 1);
            }
            await wait(5000);
            break;
          }
        }
      }
    }
    await storeModel.updateOne(
      { _id: id },
      {
        url,
        page: index,
        ship,
        num,
        prefix,
        length,
      },
      { upsert: true }
    );
    await productModel.insertMany(
      detailProducts.map((product) => ({ ...product, store: id }))
    );
    detailProducts = [];
    index++;
    let checkStop = await page.evaluate(() =>
      document.querySelector(
        "[class='ui-pagination-next ui-pagination-disabled']"
      )
    );
    if (checkStop) {
      stop++;
      break;
    } else {
      let checkNext = await page.evaluate(() =>
        document.querySelector("[class='ui-pagination-next']")
      );
      if (checkNext) {
        console.log(itemLink);
        await page.click(".ui-pagination-next");
      } else {
        stop++;
        break;
      }
    }
  }
  isCrawling = false;
  console.log("done");
  await browser.close();
});

router.post("/crawl/excel", async (req, res) => {
  const { ship, num, prefix, length } = req.query;
  const workbook = XLSX.read(req.files.file.data);
  const urlExcel = XLSX.utils
    .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
    .map((url) => url[Object.keys(url)[0]]);
  const id = mongoose.Types.ObjectId();
  isCrawling = true;
  let stopLogin = 1;
  const browser = await puppeteer.launch({
    headless: true,
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
  let convertListUrl = urlExcel.map(
    (item) =>
      "https://aliexpress" +
      item.split("aliexpress")[item.split("aliexpress").length - 1]
  );
  const subArrCount = Math.ceil(convertListUrl.length / 2);

  let subArrUrl = [];

  for (let i = 1; i <= subArrCount; i++) {
    subArrUrl.push(convertListUrl.slice(2 * (i - 1), 2 * i));
  }
  let skip = 0;
  let currentPage = 1;
  let detailProducts = [];

  while (subArrUrl.length > 0) {
    for (let i = 0; i < subArrUrl.length; i++) {
      const urls = subArrUrl[i];
      try {
        const products = await Promise.all(
          urls.map((url) => crawlProduct(url))
        );
        if (!products) {
          console.log(products);
        }
        console.log(i);
        skip = 0;
        detailProducts = [...detailProducts, ...products];
        if (i % 15 === 0 && i > 0) {
          currentPage++;
          await storeModel.updateOne(
            { _id: id },
            {
              url: "link",
              page: currentPage,
              ship,
              num,
              prefix,
              length,
            },
            { upsert: true }
          );
          await productModel.insertMany(
            detailProducts.map((product) => ({ ...product, store: id }))
          );
          detailProducts = [];

          await wait(10000);
        }
        if (i === subArrUrl.length - 1) {
          subArrUrl = [];
        }
      } catch (error) {
        if (skip === 0) {
          console.log(error?.config?.url);
          subArrUrl = subArrUrl.slice(i);
          skip++;
          await wait(5000);
          break;
        } else {
          if (skip === 3) {
            subArrUrl = [];
          } else {
            subArrUrl = subArrUrl.slice(i + 1);
          }
          await wait(5000);
          break;
        }
      }
    }
  }
  if (detailProducts.length > 0) {
    await storeModel.updateOne(
      { _id: id },
      {
        url: "link",
        page: currentPage,
        ship,
        num,
        prefix,
        length,
      },
      { upsert: true }
    );
    await productModel.insertMany(
      detailProducts.map((product) => ({ ...product, store: id }))
    );
  }

  isCrawling = false;
  console.log("done");
  await browser.close();
});

router.get("/single", async (req, res) => {
  res.status(200).json("ok");
  const data = await crawlProduct(
    "https://vi.aliexpress.com/item/4000109697862.html"
  );
  console.log(data);
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
    const linkDescription = data.descriptionModule.descriptionUrl;
    const htmlDescription = (await axios(linkDescription)).data;
    const $ = cheerio.load(htmlDescription);
    let description = $("body").html() || "";
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
          composeColor: "",
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
    throw error;
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
      composeColor: element1.propertyValueDisplayName,
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
        composeColor:
          element1.propertyValueDisplayName +
          " " +
          element2.propertyValueDisplayName,
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
          composeColor:
            element1.propertyValueDisplayName +
            " " +
            element2.propertyValueDisplayName +
            " " +
            element3.propertyValueDisplayName,

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
