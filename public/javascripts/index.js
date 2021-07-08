const store = document.getElementById("store");
const ship = document.getElementById("ship");
const num = document.getElementById("num");
const prefix = document.getElementById("prefix");
const length = document.getElementById("length");

const submit = document.getElementById("submit");

submit.addEventListener("click", async () => {
  if (store.value && ship.value && num.value && prefix.value && length.value) {
    const res = await axios.post("/crawl", {
      url: store.value,
      ship: ship.value,
      num: num.value,
      prefix: prefix.value,
      length: length.value,
    });
  } else {
    alert("Hãy nhập hết thông tin");
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
      index++;
      data.push({
        Link: `https://www.aliexpress.com/item/${product.sku}.html`,
        Id: `${store.prefix}-${index}-${product.sku}`,
        Name: formatName(product.title, store.length),
        Price: formatPrice(product.childrenSku[0].price, store.ship, store.num),
        Color: "",
        Description: product.description,
        Type: "Parent",
        parent_sku: "",
        relationship_type: "",
        variation_theme: "Color",
        "Main Image": product.childrenSku[0].image || product.ortherImage[0],
        "Other Image 1": product.ortherImage[0] || "",
        "Other Image 2": product.ortherImage[1] || "",
        "Other Image 3": product.ortherImage[2] || "",
        "Other Image 4": product.ortherImage[3] || "",
        "Other Image 5": product.ortherImage[4] || "",
        "Other Image 6": product.ortherImage[5] || "",
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
        Description: product.description,
        Type: !item.type ? "Child" : "",
        parent_sku: !item.type ? `${store.prefix}-${product.sku}` : "",
        relationship_type: !item.type ? "Variation" : "",
        variation_theme: !item.type ? "Color" : "",
        "Main Image": item.image || product.ortherImage[0],
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
  saveAs(blob, `Crawl-Ali-${moment().format("DD/MM/YYY")}.xlsx`);
});

const formatPrice = (price, ship, num) => {
  return Math.ceil((price.replaceAll(",", "") * 1 + ship * 1) * num * 1) - 0.01;
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
