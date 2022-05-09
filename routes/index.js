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
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "",
    pass: "",
  },
});

var router = express.Router();

let isCrawling = false;

router.post("/stop", async (req, res) => {
  isCrawling = false;
  res.status(200).json();
});

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
  const { url, ship, num, prefix, length, mail } = req.body;

  const id = mongoose.Types.ObjectId();
  let listUrl = [];
  let detailProducts = [];
  isCrawling = true;
  let stopLogin = 1;
  const browser = await puppeteer.launch({
    headless: true,
    product: "firefox",
  });

  const timer = setInterval(async function () {
    if (!isCrawling) {
      await browser.close();
      clearInterval(timer);
      return res.status(200).json();
    }
  }, 1000);
  const page = await browser.newPage();
  try {
    await page.goto(
      `https://trade.aliexpress.com/order_detail.htm?orderId=9999`
    );
    while (stopLogin > 0) {
      await page.waitForTimeout(3000);
      await page.click("#fm-login-id");
      await page.type("#fm-login-id", "vuthithao1304@gmail.com");
      await page.click("#fm-login-password");
      await page.waitForTimeout(5000);
      let checkCode = "";
      try {
        checkCode = await page.$eval(
          ".fm-checkcode",
          (el) => el?.style?.display || ""
        );
      } catch (err) {}
      let checkVertify = await page.$(".fm-error-tip");
      if (checkCode === "block" || checkVertify) {
        await page.mouse.drag({ x: 220, y: 300 }, { x: 600, y: 300 });
        await page.waitForTimeout(2000);
        let checkCode2 = "";
        try {
          checkCode2 = await page.$eval(
            ".fm-checkcode",
            (el) => el?.style?.display || ""
          );
        } catch (err) {}
        let checkVertify2 = await page.$(".fm-error-tip");
        if (checkCode2 === "block" || checkVertify2) {
          await page.reload();
        } else {
          stopLogin = 0;
        }
      } else {
        stopLogin = 0;
      }
    }
  } catch (error) {
    stopLogin = 0;
  }
  await page.type("#fm-login-password", "Vuthithao@1304");
  await page.click("button[type='submit']");
  await page.waitForTimeout(5000);
  let totalProduct = 0;
  if (Array.isArray(url)) {
    res.status(200).json({ total: url.length, store: id });
  } else {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    totalProduct = await page.evaluate(() =>
      parseInt(
        document
          .querySelector(".result-info")
          .innerText.replaceAll(",", "")
          .replace(/^\D+/g, "")
      )
    );
    res.status(200).json({ total: totalProduct, store: id });
  }

  let stop = 0;
  let index = 1;
  if (Array.isArray(url)) {
    console.log("cao danh sach link");
    stop = 1;
    let convertListUrl = url;
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
        url: "List Link",
        page: 1,
        ship,
        num,
        prefix,
        length,
        total: url.length,
      },
      { upsert: true }
    );
    await productModel.insertMany(
      detailProducts.map((product) => ({ ...product, store: id }))
    );
  }
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
        total: totalProduct,
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

  // if (mail) {
  //   const products = await productModel.find({
  //     store: id,
  //   });
  //   const store = await storeModel.findById(id);
  //   const filterProducts = products.filter((pro) => pro.childrenSku.length > 0);
  //   let index = 0;
  //   let data = [];
  //   filterProducts.forEach((product) => {
  //     if (!product.childrenSku[0].type) {
  //       data.push({
  //         Link: `https://www.aliexpress.com/item/${product.sku}.html`,
  //         Id: `${store.prefix}-${product.sku}`,
  //         Name: formatName(product.title, store.length),
  //         Price: "",
  //         Color: "",
  //         Description: product.description
  //           .replace(
  //             /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
  //             ""
  //           )
  //           .replace(/(\r\n|\n|\r)/gm, "")
  //           .replace(/<style([\s\S]*?)<\/style>/gi, "")
  //           .replace(/<script([\s\S]*?)<\/script>/gi, "")
  //           .replace(/<\/div>/gi, "\n")
  //           .replace(/<div[^>]*>/gi, "\n")
  //           .replace(/<\/li>/gi, "\n")
  //           .replace(/<li[^>]*/gi, "\n")
  //           .replace(/<\/ul>/gi, "\n")
  //           .replace(/<ul[^>]*/gi, "\n")
  //           .replace(/<\/p>/gi, "\n")
  //           .replace(/<p[^>]*>/gi, "\n")
  //           .replace(/<br>/gi, "\n")
  //           .replace(/<[^>]*>/gi, "")
  //           .trim(),
  //         Type: "Parent",
  //         parent_sku: "",
  //         relationship_type: "",
  //         variation_theme: "Color",
  //         "Main Image": "",
  //         "Other Image 1": "",
  //         "Other Image 2": "",
  //         "Other Image 3": "",
  //         "Other Image 4": "",
  //         "Other Image 5": "",
  //         "Other Image 6": "",
  //       });
  //     }
  //     product.childrenSku.forEach((item) => {
  //       index++;
  //       data.push({
  //         Link: `https://www.aliexpress.com/item/${product.sku}.html`,
  //         Id: `${store.prefix}-${index}-${product.sku}`,
  //         Name: formatName(product.title, store.length),
  //         Price: formatPrice(item.price, store.ship, store.num),
  //         Color: !item.type ? item.composeColor : "",
  //         Description: product.description
  //           .replace(
  //             /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
  //             ""
  //           )
  //           .replace(/(\r\n|\n|\r)/gm, "")
  //           .replace(/<style([\s\S]*?)<\/style>/gi, "")
  //           .replace(/<script([\s\S]*?)<\/script>/gi, "")
  //           .replace(/<\/div>/gi, "\n")
  //           .replace(/<div[^>]*>/gi, "\n")
  //           .replace(/<\/li>/gi, "\n")
  //           .replace(/<li[^>]*/gi, "\n")
  //           .replace(/<\/ul>/gi, "\n")
  //           .replace(/<ul[^>]*/gi, "\n")
  //           .replace(/<\/p>/gi, "\n")
  //           .replace(/<p[^>]*>/gi, "\n")
  //           .replace(/<br>/gi, "\n")
  //           .replace(/<[^>]*>/gi, "")
  //           .trim(),
  //         Type: !item.type ? "Child" : "",
  //         parent_sku: !item.type ? `${store.prefix}-${product.sku}` : "",
  //         relationship_type: !item.type ? "Variation" : "",
  //         variation_theme: !item.type ? "Color" : "",
  //         "Main Image": (item.image || product.ortherImage[0]).replace(
  //           "_640x640.jpg",
  //           ""
  //         ),
  //         "Other Image 1": product.ortherImage[0] || "",
  //         "Other Image 2": product.ortherImage[1] || "",
  //         "Other Image 3": product.ortherImage[2] || "",
  //         "Other Image 4": product.ortherImage[3] || "",
  //         "Other Image 5": product.ortherImage[4] || "",
  //         "Other Image 6": product.ortherImage[5] || "",
  //       });
  //     });
  //   });
  //   var wb = XLSX.utils.book_new();

  //   wb.SheetNames.push("Ali");

  //   var ws = XLSX.utils.json_to_sheet(data);

  //   wb.Sheets["Ali"] = ws;

  //   var wbout = XLSX.write(wb, {
  //     type: "buffer",
  //     bookType: "xlsx",
  //     bookSST: false,
  //   });
  //   transporter.sendMail(
  //     {
  //       from: "vietanhcrawlali@gmail.com",
  //       to: mail,
  //       subject: "Lấy dữ liệu Aliexpress thành công",
  //       text: "Đã lấy dữ liệu thành công, hãy tải tệp excel để xem chi tiết",
  //       attachments: [
  //         {
  //           filename: prefix + ".xlsx",
  //           content: wbout,
  //         },
  //       ],
  //     },
  //     (err, success) => {
  //       if (err) {
  //         console.log(err);
  //       } else {
  //         console.log("gửi mail thành công");
  //       }
  //     }
  //   );
  // }
  await browser.close();
});

router.post("/crawl/excel", async (req, res) => {
  const { ship, num, prefix, length, mail } = req.query;
  const workbook = XLSX.read(req.files.file.data);
  const urlExcel = XLSX.utils
    .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
    .map((url) => url[Object.keys(url)[0]]);
  const id = mongoose.Types.ObjectId();
  isCrawling = true;
  let stopLogin = 1;
  const browser = await puppeteer.launch({
    headless: true,
    product: "firefox",
  });

  const page = await browser.newPage();
  await page.goto(`https://trade.aliexpress.com/order_detail.htm?orderId=9999`);
  const timer = setInterval(async function () {
    if (!isCrawling) {
      await browser.close();
      clearInterval(timer);
      return res.status(200).json();
    }
  }, 1000);
  await page.goto(`https://trade.aliexpress.com/order_detail.htm?orderId=9999`);
  while (stopLogin > 0) {
    await page.waitForTimeout(3000);
    await page.click("#fm-login-id");
    await page.type("#fm-login-id", "vuthithao1304@gmail.com");
    await page.click("#fm-login-password");
    await page.waitForTimeout(5000);
    let checkCode = "";
    try {
      checkCode = await page.$eval(
        ".fm-checkcode",
        (el) => el?.style?.display || ""
      );
    } catch (err) {}
    let checkVertify = await page.$(".fm-error-tip");
    if (checkCode === "block" || checkVertify) {
      await page.mouse.drag({ x: 220, y: 300 }, { x: 600, y: 300 });
      await page.waitForTimeout(2000);
      let checkCode2 = "";
      try {
        checkCode2 = await page.$eval(
          ".fm-checkcode",
          (el) => el?.style?.display || ""
        );
      } catch (err) {}
      let checkVertify2 = await page.$(".fm-error-tip");
      if (checkCode2 === "block" || checkVertify2) {
        await page.reload();
      } else {
        stopLogin = 0;
      }
    } else {
      stopLogin = 0;
    }
  }
  await page.type("#fm-login-password", "Vuthithao@1304");
  await page.click("button[type='submit']");
  await page.waitForNavigation();
  res.status(200).json({ total: urlExcel?.length || 0, store: id });

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
              total: urlExcel?.length || 0,
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
        total: urlExcel?.length || 0,
      },
      { upsert: true }
    );
    await productModel.insertMany(
      detailProducts.map((product) => ({ ...product, store: id }))
    );
  }

  isCrawling = false;
  console.log("done");
  // if (mail) {
  //   const products = await productModel.find({
  //     store: id,
  //   });
  //   const store = await storeModel.findById(id);
  //   const filterProducts = products.filter((pro) => pro.childrenSku.length > 0);
  //   let index = 0;
  //   let data = [];
  //   filterProducts.forEach((product) => {
  //     if (!product.childrenSku[0].type) {
  //       data.push({
  //         Link: `https://www.aliexpress.com/item/${product.sku}.html`,
  //         Id: `${store.prefix}-${product.sku}`,
  //         Name: formatName(product.title, store.length),
  //         Price: "",
  //         Color: "",
  //         Description: product.description
  //           .replace(
  //             /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
  //             ""
  //           )
  //           .replace(/(\r\n|\n|\r)/gm, "")
  //           .replace(/<style([\s\S]*?)<\/style>/gi, "")
  //           .replace(/<script([\s\S]*?)<\/script>/gi, "")
  //           .replace(/<\/div>/gi, "\n")
  //           .replace(/<div[^>]*>/gi, "\n")
  //           .replace(/<\/li>/gi, "\n")
  //           .replace(/<li[^>]*/gi, "\n")
  //           .replace(/<\/ul>/gi, "\n")
  //           .replace(/<ul[^>]*/gi, "\n")
  //           .replace(/<\/p>/gi, "\n")
  //           .replace(/<p[^>]*>/gi, "\n")
  //           .replace(/<br>/gi, "\n")
  //           .replace(/<[^>]*>/gi, "")
  //           .trim(),
  //         Type: "Parent",
  //         parent_sku: "",
  //         relationship_type: "",
  //         variation_theme: "Color",
  //         "Main Image": "",
  //         "Other Image 1": "",
  //         "Other Image 2": "",
  //         "Other Image 3": "",
  //         "Other Image 4": "",
  //         "Other Image 5": "",
  //         "Other Image 6": "",
  //       });
  //     }
  //     product.childrenSku.forEach((item) => {
  //       index++;
  //       data.push({
  //         Link: `https://www.aliexpress.com/item/${product.sku}.html`,
  //         Id: `${store.prefix}-${index}-${product.sku}`,
  //         Name: formatName(product.title, store.length),
  //         Price: formatPrice(item.price, store.ship, store.num),
  //         Color: !item.type ? item.composeColor : "",
  //         Description: product.description
  //           .replace(
  //             /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
  //             ""
  //           )
  //           .replace(/(\r\n|\n|\r)/gm, "")
  //           .replace(/<style([\s\S]*?)<\/style>/gi, "")
  //           .replace(/<script([\s\S]*?)<\/script>/gi, "")
  //           .replace(/<\/div>/gi, "\n")
  //           .replace(/<div[^>]*>/gi, "\n")
  //           .replace(/<\/li>/gi, "\n")
  //           .replace(/<li[^>]*/gi, "\n")
  //           .replace(/<\/ul>/gi, "\n")
  //           .replace(/<ul[^>]*/gi, "\n")
  //           .replace(/<\/p>/gi, "\n")
  //           .replace(/<p[^>]*>/gi, "\n")
  //           .replace(/<br>/gi, "\n")
  //           .replace(/<[^>]*>/gi, "")
  //           .trim(),
  //         Type: !item.type ? "Child" : "",
  //         parent_sku: !item.type ? `${store.prefix}-${product.sku}` : "",
  //         relationship_type: !item.type ? "Variation" : "",
  //         variation_theme: !item.type ? "Color" : "",
  //         "Main Image": (item.image || product.ortherImage[0]).replace(
  //           "_640x640.jpg",
  //           ""
  //         ),
  //         "Other Image 1": product.ortherImage[0] || "",
  //         "Other Image 2": product.ortherImage[1] || "",
  //         "Other Image 3": product.ortherImage[2] || "",
  //         "Other Image 4": product.ortherImage[3] || "",
  //         "Other Image 5": product.ortherImage[4] || "",
  //         "Other Image 6": product.ortherImage[5] || "",
  //       });
  //     });
  //   });
  //   var wb = XLSX.utils.book_new();

  //   wb.SheetNames.push("Ali");

  //   var ws = XLSX.utils.json_to_sheet(data);

  //   wb.Sheets["Ali"] = ws;

  //   var wbout = XLSX.write(wb, {
  //     type: "buffer",
  //     bookType: "xlsx",
  //     bookSST: false,
  //   });
  //   transporter.sendMail(
  //     {
  //       from: "vietanhcrawlali@gmail.com",
  //       to: mail,
  //       subject: "Lấy dữ liệu Aliexpress thành công",
  //       text: "Đã lấy dữ liệu thành công, hãy tải tệp excel để xem chi tiết",
  //       attachments: [
  //         {
  //           filename: prefix + ".xlsx",
  //           content: wbout,
  //         },
  //       ],
  //     },
  //     (err, success) => {
  //       if (err) {
  //         console.log(err);
  //       } else {
  //         console.log("gửi mail thành công");
  //       }
  //     }
  //   );
  // }
  await browser.close();
});

router.get("/crawl", async (req, res) => {
  const store = await storeModel.findOne({}, {}, { sort: { created_at: -1 } });
  try {
    const count = await productModel.countDocuments({
      store: store?._id,
    });
    res.status(200).json({ count, store });
  } catch (error) {
    res.status(200).json({ count: 0, store });
  }
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
    const html = (await axios({ url, timeout: 20000 })).data;
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
    });

    const data = dom.window.runParams.data;
    const sku = data.commonModule.productId;
    const title = data.titleModule.subject;
    const tradeCount = data.titleModule.tradeCount;
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
      tradeCount,
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
          "-" +
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
            "-" +
            element2.propertyValueDisplayName +
            "-" +
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
        (item["Ships From"].toUpperCase() == "UNITED STATES" ||
          item["Ships From"].toUpperCase() == "US" ||
          item["Ships From"].toUpperCase() == "HOA KỲ" ||
          item["Ships From"].toUpperCase() == "CN" ||
          item["Ships From"].toUpperCase() == "CHINA") &&
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

const formatPrice = (price, ship, num) => {
  return (
    Math.ceil(((price.replaceAll(",", "") * 1 + ship * 1) * (num * 1)) / 0.85) -
    0.01
  );
};

const formatName = (name, length) => {
  if (name.length <= length) {
    return name;
  } else if (name.charAt(length) == " ") {
    return name.slice(0, length);
  } else {
    return name.slice(0, length).split(" ").slice(0, -1).join(" ");
  }
};

module.exports = router;
