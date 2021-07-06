const axios = require("axios");
var express = require("express");
const jsdom = require("jsdom");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { JSDOM } = jsdom;

var router = express.Router();

router.get("/", async (req, res) => {
  let listUrl = [];
  let stopLogin = 1;
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
    await page.waitForTimeout(1000);
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
  await page.waitForTimeout(2000);
  await page.goto(
    "https://vi.aliexpress.com/store/5747126/search/2.html?spm=a2g0o.store_pc_allProduct.8148361.1.5146367dd2Mfoy&origin=n&SortType=bestmatch_sort",
    {
      waitUntil: "domcontentloaded",
    }
  );
  let stop = 0;
  let index = 1;
  while (stop < 1) {
    console.log(index);
    await page.click(".ui-pagination-next");
    await page.waitForTimeout(2000);
    let checkStop = await page.evaluate(() =>
      document.querySelector(".ui-pagination-disabled")
    );
    if (checkStop) {
      stop++;
      break;
    }
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
    console.log(itemLink);
  }

  const detailProduct = await Promise.all(
    listUrl.slice(0, 30).map((url) => crawlProduct(url))
  );
  console.log(detailProduct);

  res.status(200).json();
});

const crawlProduct = async (url) => {
  const html = (await axios("https:" + url)).data;
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
  });

  const data = dom.window.runParams.data;
  const sku = data.commonModule.productId;
  const title = data.pageModule.title;
  let description = "";
  const linkDescription = data.descriptionModule.descriptionUrl;
  const htmlDescription = (await axios(linkDescription)).data;
  const $ = cheerio.load(htmlDescription);
  const text = $(".detailmodule_text  p");
  if (text.length > 0) {
    for (let index = 0; index < text.length; index++) {
      const element = $(text[index]);
      let textHtml = element.html();
      description = description
        .concat(textHtml.slice(0).replace(/<br>/gm, "\n"))
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

module.exports = router;
