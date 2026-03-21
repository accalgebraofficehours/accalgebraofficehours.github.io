async function packSite(entry) {

  const fs = new Map();
  const queue = [entry];

  function abs(base, url) {
    return new URL(url, base).href;
  }

  while (queue.length) {

    const url = queue.pop();
    if (fs.has(url)) continue;

    const res = await fetch(url);
    const text = await res.text();

    fs.set(url, text);

    if (res.headers.get("content-type")?.includes("text/html")) {

      const doc = new DOMParser().parseFromString(text, "text/html");

      doc.querySelectorAll("[src],[href]").forEach(el => {

        const attr = el.src ? "src" : "href";
        const val = el.getAttribute(attr);

        if (!val) return;

        const absolute = abs(url,val);

        if (!fs.has(absolute))
          queue.push(absolute);

      });

    }

  }

  const runtime = `
  const FS = new Map(${JSON.stringify([...fs])});

  const realFetch = window.fetch;

  window.fetch = async function(url){

    const abs = new URL(url, location.href).href;

    if(FS.has(abs)){
      return new Response(FS.get(abs));
    }

    return realFetch(url);
  };

  console.log("Virtual FS ready", FS);
  `;

  const html = fs.get(entry);

  const final =
  "<script>" + runtime + "<\\/script>" +
  html;

  const blob = new Blob([final],{type:"text/html"});

  window.open(URL.createObjectURL(blob));
}

packSite("https://coolors.co");
