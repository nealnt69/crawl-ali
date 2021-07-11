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
        Color: !item.type ? item.composeColor.replace(" ", "-") : "",
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
    Math.ceil((price.replaceAll(",", "") * 1 + ship * 1) / (num * 1)) - 0.01
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
