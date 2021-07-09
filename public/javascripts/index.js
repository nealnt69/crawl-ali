const store = document.getElementById("store");
const ship = document.getElementById("ship");
const num = document.getElementById("num");
const prefix = document.getElementById("prefix");
const length = document.getElementById("length");

const submit = document.getElementById("submit");

const actualBtn = document.getElementById("actual-btn");

const fileChosen = document.getElementById("file-chosen");

actualBtn.addEventListener("change", function () {
  fileChosen.textContent = this.files[0].name;
});

submit.addEventListener("click", async () => {
  if (store.value && ship.value && num.value && prefix.value && length.value) {
    submit.disabled = true;
    submit.innerHTML = "Đang lấy dữ liệu, hãy đợi";
    alert("Đang trong quá trình lấy dữ liệu, hãy đợi");
    if (actualBtn.files[0]) {
      const formData = new FormData();
      formData.append("file", actualBtn.files[0]);
      actualBtn.value = null;
      fileChosen.textContent = "";
      const res = await axios.post(
        `/crawl/excel?ship=${ship.value}&num=${num.value}&prefix=${prefix.value}&length=${length.value}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    } else {
      const res = await axios.post("/crawl", {
        url: store.value,
        ship: ship.value,
        num: num.value,
        prefix: prefix.value,
        length: length.value,
      });
    }
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
      data.push({
        Link: `https://www.aliexpress.com/item/${product.sku}.html`,
        Id: `${store.prefix}-${product.sku}`,
        Name: formatName(product.title, store.length),
        Price: formatPrice(product.childrenSku[0].price, store.ship, store.num),
        Color: "",
        Description: product.description
          .replace(
            /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
            ""
          )
          .replace(/<style([\s\S]*?)<\/style>/gi, "")
          .replace(/<script([\s\S]*?)<\/script>/gi, "")
          .replace(/<\/div>/gi, "\n")
          .replace(/<\/li>/gi, "\n")
          .replace(/<li>/gi, "  *  ")
          .replace(/<\/ul>/gi, "\n")
          .replace(/(\r\n|\n|\r)/gm, "")
          .replace(/<br>/gi, "\n")
          .replace(/<[^>]*>/gi, "")
          .replace("&nbsp;", "")
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
          .replace(/<\s*script[^>]*>(.*?)<\s*\/\s*script>/, "")
          .replace(
            /<(\w+)\s[^>]*overflow:hidden[^>]*>(\s*)(.*?)(\s*)<[^>]*>/g,
            ""
          )
          .replace(/(\r\n|\n|\r)/gm, "")
          .replace(/<br>/gi, "\n")
          .replace(/<[^>]*>/gi, "")
          .replace("&nbsp;", "")
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
