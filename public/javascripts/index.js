const store = document.getElementById("store");
const ship = document.getElementById("ship");
const num = document.getElementById("num");
const prefix = document.getElementById("prefix");
const length = document.getElementById("length");
const mail = document.getElementById("mail");

const submit = document.getElementById("submit");

const actualBtn = document.getElementById("actual-btn");

const fileChosen = document.getElementById("file-chosen");

actualBtn.addEventListener("change", function () {
  fileChosen.textContent = this.files[0].name;
});

let getValueInterval;
let productListFull = [];
let storeCur = {};

$("#progress").click(() => {
  if ($("#submit").attr("disabled")) {
    getNumberCrawl();
  }
});
$("#history").click(() => {
  $(".list-crawl").toggle();
});

$(".close").click(() => {
  $("#modal-progress").css("display", "none");
});

submit.addEventListener("click", async () => {
  if (store.value && ship.value && num.value && prefix.value && length.value) {
    $("#modal-progress").css("display", "flex");
    $(".modal-progress-current").text("0");
    $(".modal-progress-total").text("0");
    submit.disabled = true;
    submit.innerHTML = "Đang lấy dữ liệu, hãy đợi";
    if (actualBtn.files[0]) {
      const formData = new FormData();
      formData.append("file", actualBtn.files[0]);
      actualBtn.value = null;
      fileChosen.textContent = "";
      const res = await axios.post(
        `/crawl/excel?ship=${ship.value}&num=${num.value}&prefix=${prefix.value}&length=${length.value}&mail=${mail.value}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      localStorage.setItem("crawl", JSON.stringify(res.data));
      $("#modal-progress").css("display", "flex");
      $(".modal-progress-current").text("0");
      $(".modal-progress-total").text(res.data.total);
    } else {
      const res = await axios.post("/crawl", {
        url: store.value,
        ship: ship.value,
        num: num.value,
        prefix: prefix.value,
        length: length.value,
        mail: mail.value,
      });
      localStorage.setItem("crawl", JSON.stringify(res.data));
      $("#modal-progress").css("display", "flex");
      $(".modal-progress-current").text("0");
      $(".modal-progress-total").text(res.data.total);
    }
    getNumberCrawl();
  } else {
    alert("Hãy nhập hết thông tin");
  }
});

$(".crawl-download-full").click(async function () {
  const id = $(this).attr("id");
  const res = await axios(`/download?id=${id}`);
  const { store, products } = res.data;
  productListFull = products.filter((pro) => pro.childrenSku.length > 0);
  storeCur = store;
  $("#modal-full-file").css("display", "flex");
});

$("#download").click(function () {
  const productType = $("#ProductType").val();
  const BrandName = $("#BrandName").val();
  const TypeKeyword = $("#TypeKeyword").val();
  const ProductFeature1 = $("#ProductFeature1").val();
  const ProductFeature2 = $("#ProductFeature2").val();
  const ProductFeature3 = $("#ProductFeature3").val();
  const ProductFeature4 = $("#ProductFeature4").val();
  const ProductFeature5 = $("#ProductFeature5").val();
  console.log(
    productType,
    BrandName,
    TypeKeyword,
    ProductFeature1,
    ProductFeature2,
    ProductFeature3,
    ProductFeature4,
    ProductFeature5
  );
  if (
    productType.length > 0 &&
    BrandName.length > 0 &&
    TypeKeyword.length > 0 &&
    (ProductFeature1.length > 0) & (ProductFeature2.length > 0) &&
    ProductFeature3.length > 0 &&
    ProductFeature4.length > 0 &&
    ProductFeature5.length > 0
  ) {
    let data = [];
    data.push({
      "TemplateType=fptcustom": "Product Type",
      "Version=2021.0709": "Item Type Keyword",
      "TemplateSignature=TVVMVElUT09M": "Brand Name",
      "settings=contentLanguageTag=en_US&feedType=610841&headerLanguageTag=en_US&primaryMarketplaceId=amzn1.mp.o.ATVPDKIKX0DER&templateIdentifier=c8bf49ba-63dc-4a50-9056-059404a3a2aa&timestamp=2021-07-09T17%3A36%3A18.873Z":
        "Manufacturer",
      "Use ENGLISH to fill this template.The top 3 rows are for Amazon.com use only. Do not modify or delete the top 3 rows.":
        "Product ID",
      a1: "Product ID Type",
      a2: "Link SP",
      a3: "Key Product Features",
      a4: "Seller SKU",
      a5: "Product Name",
      a6: "Standard Price",
      a7: "Quantity",
      a8: "Main Image URL",
      Images: "Other Image URL",
      a9: "Other Image URL",
      a10: "Other Image URL",
      a11: "Other Image URL",
      a12: "Other Image URL",
      a13: "Other Image URL",
      Variation: "Parentage",
      a14: "Parent SKU",
      a15: "Relationship Type",
      a16: "Variation Theme",
      Basic: "Update Delete",
      a17: "Manufacturer Part Number",
      a18: "Product Description",
      Discovery: "Catalog Number",
      a19: "Key Product Features",
      a20: "Key Product Features",
      a21: "Key Product Features",
      a22: "Key Product Features",
      a23: "Search Terms",
      a24: "Color",
      a25: "Color Map",
      a26: "Unit Count",
      a27: "Unit Count Type",
      a28: "Size",
      a29: "Size Map",
      a30: "Handling Time",
      a31: "Intended Use",
      a32: "Target Audience",
      a33: "Other Attributes",
      a34: "Subject Matter",
    });

    data.push({
      "TemplateType=fptcustom": "feed_product_type",
      "Version=2021.0709": "item_type",
      "TemplateSignature=TVVMVElUT09M": "brand_name",
      "settings=contentLanguageTag=en_US&feedType=610841&headerLanguageTag=en_US&primaryMarketplaceId=amzn1.mp.o.ATVPDKIKX0DER&templateIdentifier=c8bf49ba-63dc-4a50-9056-059404a3a2aa&timestamp=2021-07-09T17%3A36%3A18.873Z":
        "manufacturer",
      "Use ENGLISH to fill this template.The top 3 rows are for Amazon.com use only. Do not modify or delete the top 3 rows.":
        "external_product_id",
      a1: "external_product_id_type",
      a2: "",
      a3: "bullet_point1",
      a4: "item_sku",
      a5: "item_name",
      a6: "standard_price",
      a7: "quantity",
      a8: "main_image_url",
      Images: "other_image_url1",
      a9: "other_image_url2",
      a10: "other_image_url3",
      a11: "other_image_url4",
      a12: "other_image_url5",
      a13: "other_image_url6",
      Variation: "parent_child",
      a14: "parent_sku",
      a15: "relationship_type",
      a16: "variation_theme",
      Basic: "update_delete",
      a17: "part_number",
      a18: "product_description",
      Discovery: "catalog_number",
      a19: "bullet_point2",
      a20: "bullet_point3",
      a21: "bullet_point4",
      a22: "bullet_point5",
      a23: "generic_keywords",
      a24: "color_name",
      a25: "color_map",
      a26: "unit_count",
      a27: "unit Count Type",
      a28: "size_name",
      a29: "size Map",
      a30: "fulfillment_latency",
      a31: "specific_uses_keywords1",
      a32: "target_audience_keywords1",
      a33: "thesaurus_attribute_keywords",
      a34: "thesaurus_subject_keywords1",
    });
    let index = 1;
    productListFull.forEach((product) => {
      if (!product.childrenSku[0].type) {
        data.push({
          "TemplateType=fptcustom": productType,
          "Version=2021.0709": TypeKeyword,
          "TemplateSignature=TVVMVElUT09M": BrandName,
          "settings=contentLanguageTag=en_US&feedType=610841&headerLanguageTag=en_US&primaryMarketplaceId=amzn1.mp.o.ATVPDKIKX0DER&templateIdentifier=c8bf49ba-63dc-4a50-9056-059404a3a2aa&timestamp=2021-07-09T17%3A36%3A18.873Z":
            BrandName,
          "Use ENGLISH to fill this template.The top 3 rows are for Amazon.com use only. Do not modify or delete the top 3 rows.":
            "",
          a1: "",
          a2: `https://www.aliexpress.com/item/${product.sku}.html`,
          a3: "",
          a4: `${storeCur.prefix}-${product.sku}`,
          a5: formatName(product.title, storeCur.length),
          a6: "",
          a7: "50",
          a8: "",
          Images: "",
          a9: "",
          a10: "",
          a11: "",
          a12: "",
          a13: "",
          Variation: "Parent",
          a14: "",
          a15: "",
          a16: "Color",
          Basic: "",
          a17: "",
          a18: product.description
            .replace(
              /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
              ""
            )
            .replace(/(\r\n|\n|\r)/gm, "")
            .replace(/<style([\s\S]*?)<\/style>/gi, "")
            .replace(/<script([\s\S]*?)<\/script>/gi, "")
            .replace(/<\/div>/gi, "\n")
            .replace(/<div[^>]*>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<li[^>]*/gi, "\n")
            .replace(/<\/ul>/gi, "\n")
            .replace(/<ul[^>]*/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<p[^>]*>/gi, "\n")
            .replace(/<br>/gi, "\n")
            .replace(/<[^>]*>/gi, "")
            .trim(),
          Discovery: "",
          a19: "",
          a20: "",
          a21: "",
          a22: "",
          a23: "",
          a24: "",
          a25: "",
          a26: "1",
          a27: "count",
          a28: "",
          a29: "",
          a30: "10",
          a31: "",
          a32: "",
          a33: "",
          a34: "",
        });
      }
      product.childrenSku.forEach((item) => {
        index++;
        data.push({
          "TemplateType=fptcustom": productType,
          "Version=2021.0709": TypeKeyword,
          "TemplateSignature=TVVMVElUT09M": BrandName,
          "settings=contentLanguageTag=en_US&feedType=610841&headerLanguageTag=en_US&primaryMarketplaceId=amzn1.mp.o.ATVPDKIKX0DER&templateIdentifier=c8bf49ba-63dc-4a50-9056-059404a3a2aa&timestamp=2021-07-09T17%3A36%3A18.873Z":
            BrandName,
          "Use ENGLISH to fill this template.The top 3 rows are for Amazon.com use only. Do not modify or delete the top 3 rows.":
            "",
          a1: "",
          a2: `https://www.aliexpress.com/item/${product.sku}.html`,
          a3: "",
          a4: `${storeCur.prefix}-${index}-${product.sku}`,
          a5: formatName(product.title, storeCur.length),
          a6: formatPrice(item.price, storeCur.ship, storeCur.num),
          a7: "50",
          a8: (item.image || product.ortherImage[0]).replace(
            "_640x640.jpg",
            ""
          ),
          Images: product.ortherImage[0] || "",
          a9: product.ortherImage[1] || "",
          a10: product.ortherImage[2] || "",
          a11: product.ortherImage[3] || "",
          a12: product.ortherImage[4] || "",
          a13: product.ortherImage[5] || "",
          Variation: !item.type ? "Child" : "",
          a14: !item.type ? `${storeCur.prefix}-${product.sku}` : "",
          a15: "Variation",
          a16: "Color",
          Basic: "",
          a17: "",
          a18: product.description
            .replace(
              /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
              ""
            )
            .replace(/(\r\n|\n|\r)/gm, "")
            .replace(/<style([\s\S]*?)<\/style>/gi, "")
            .replace(/<script([\s\S]*?)<\/script>/gi, "")
            .replace(/<\/div>/gi, "\n")
            .replace(/<div[^>]*>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<li[^>]*/gi, "\n")
            .replace(/<\/ul>/gi, "\n")
            .replace(/<ul[^>]*/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<p[^>]*>/gi, "\n")
            .replace(/<br>/gi, "\n")
            .replace(/<[^>]*>/gi, "")
            .trim(),
          Discovery: "",
          a19: "",
          a20: "",
          a21: "",
          a22: "",
          a23: "",
          a24: !item.type ? item.composeColor : "",
          a25: !item.type ? item.composeColor : "",
          a26: "1",
          a27: "count",
          a28: "",
          a29: "",
          a30: "10",
          a31: "",
          a32: "",
          a33: "",
          a34: "",
        });
      });
    });

    var wb = XLSX.utils.book_new();

    wb.SheetNames.push("Ali");

    var ws = XLSX.utils.json_to_sheet(data);
    ws.F1.v = "";
    ws.G1.v = "";
    ws.H1.v = "";
    ws.I1.v = "";
    ws.J1.v = "";
    ws.K1.v = "";
    ws.L1.v = "";
    ws.M1.v = "";
    ws.O1.v = "";
    ws.P1.v = "";
    ws.Q1.v = "";
    ws.R1.v = "";
    ws.S1.v = "";
    ws.U1.v = "";
    ws.V1.v = "";
    ws.W1.v = "";
    ws.Y1.v = "";
    ws.Z1.v = "";
    ws.AB1.v = "";
    ws.AC1.v = "";
    ws.AD1.v = "";
    ws.AE1.v = "";
    ws.AF1.v = "";
    ws.AG1.v = "";
    ws.AH1.v = "";
    ws.AI1.v = "";
    ws.AJ1.v = "";
    ws.AK1.v = "";
    ws.AL1.v = "";
    ws.AM1.v = "";
    ws.AN1.v = "";
    ws.AO1.v = "";
    ws.AP1.v = "";
    ws.AQ1.v = "";

    wb.Sheets["Ali"] = ws;

    var wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(blob, `Cao-${storeCur.prefix}.xlsx`);
  } else {
    alert("Hãy nhập đủ thông tin");
  }
});

$(".crawl-download").click(async function () {
  const id = $(this).attr("id");
  const res = await axios(`/download?id=${id}`);
  const { store, products } = res.data;
  const filterProducts = products.filter((pro) => pro.childrenSku.length > 0);
  let index = 0;
  let data = [];
  filterProducts.forEach((product) => {
    if (!product.childrenSku[0].type) {
      data.push({
        Link: `https://www.aliexpress.com/item/${product.sku}.html`,
        Id: `${store.prefix}-${product.sku}`,
        Name: formatName(product.title, store.length),
        Price: "",
        Color: "",
        Description: product.description
          .replace(
            /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
            ""
          )
          .replace(/(\r\n|\n|\r)/gm, "")
          .replace(/<style([\s\S]*?)<\/style>/gi, "")
          .replace(/<script([\s\S]*?)<\/script>/gi, "")
          .replace(/<\/div>/gi, "\n")
          .replace(/<div[^>]*>/gi, "\n")
          .replace(/<\/li>/gi, "\n")
          .replace(/<li[^>]*/gi, "\n")
          .replace(/<\/ul>/gi, "\n")
          .replace(/<ul[^>]*/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<p[^>]*>/gi, "\n")
          .replace(/<br>/gi, "\n")
          .replace(/<[^>]*>/gi, "")
          .trim(),
        Type: "Parent",
        parent_sku: "",
        relationship_type: "",
        variation_theme: "Color",
        "Main Image": "",
        "Other Image 1": "",
        "Other Image 2": "",
        "Other Image 3": "",
        "Other Image 4": "",
        "Other Image 5": "",
        "Other Image 6": "",
      });
    }
    product.childrenSku.forEach((item) => {
      index++;
      data.push({
        Link: `https://www.aliexpress.com/item/${product.sku}.html`,
        Id: `${store.prefix}-${index}-${product.sku}`,
        Name: formatName(product.title, store.length),
        Price: formatPrice(item.price, store.ship, store.num),
        Color: !item.type ? item.composeColor : "",
        Description: product.description
          .replace(
            /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
            ""
          )
          .replace(/(\r\n|\n|\r)/gm, "")
          .replace(/<style([\s\S]*?)<\/style>/gi, "")
          .replace(/<script([\s\S]*?)<\/script>/gi, "")
          .replace(/<\/div>/gi, "\n")
          .replace(/<div[^>]*>/gi, "\n")
          .replace(/<\/li>/gi, "\n")
          .replace(/<li[^>]*/gi, "\n")
          .replace(/<\/ul>/gi, "\n")
          .replace(/<ul[^>]*/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<p[^>]*>/gi, "\n")
          .replace(/<br>/gi, "\n")
          .replace(/<[^>]*>/gi, "")
          .trim(),
        Type: !item.type ? "Child" : "",
        parent_sku: !item.type ? `${store.prefix}-${product.sku}` : "",
        relationship_type: !item.type ? "Variation" : "",
        variation_theme: !item.type ? "Color" : "",
        "Main Image": (item.image || product.ortherImage[0]).replace(
          "_640x640.jpg",
          ""
        ),
        "Other Image 1": product.ortherImage[0] || "",
        "Other Image 2": product.ortherImage[1] || "",
        "Other Image 3": product.ortherImage[2] || "",
        "Other Image 4": product.ortherImage[3] || "",
        "Other Image 5": product.ortherImage[4] || "",
        "Other Image 6": product.ortherImage[5] || "",
      });
    });
  });

  var wb = XLSX.utils.book_new();

  wb.SheetNames.push("Ali");

  var ws = XLSX.utils.json_to_sheet(data);

  wb.Sheets["Ali"] = ws;

  var wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });
  saveAs(blob, `${store.prefix}.xlsx`);
});

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

const getNumberCrawl = async () => {
  const res = await axios(
    `/crawl?store=${JSON.parse(localStorage.getItem("crawl")).store}`
  );
  if (res.data.count >= JSON.parse(localStorage.getItem("crawl")).total) {
    clearInterval(getValueInterval);
  }
  $("#modal-progress").css("display", "flex");
  $(".modal-progress-current").text(res.data.count);
  $(".modal-progress-total").text(
    JSON.parse(localStorage.getItem("crawl")).total
  );
  getValueInterval = setInterval(async () => {
    const res = await axios(
      `/crawl?store=${JSON.parse(localStorage.getItem("crawl")).store}`
    );
    if (res.data.count >= JSON.parse(localStorage.getItem("crawl")).total) {
      clearInterval(getValueInterval);
    }
    $("#modal-progress").css("display", "flex");
    $(".modal-progress-current").text(res.data.count);
    $(".modal-progress-total").text(
      JSON.parse(localStorage.getItem("crawl")).total
    );
  }, 20000);
};
