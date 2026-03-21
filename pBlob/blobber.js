//Complete chatgpt shit code


async function cloneSite(startUrl) {

  const fetched = new Map();

  async function fetchAsBlob(url) {
    if (fetched.has(url)) return fetched.get(url);

    const res = await fetch(url);
    const blob = await res.blob();

    const blobURL = URL.createObjectURL(blob);
    fetched.set(url, blobURL);

    return blobURL;
  }

  function absolute(base, path) {
    return new URL(path, base).href;
  }

  const res = await fetch(startUrl);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const elements = [
    ["script[src]", "src"],
    ["img[src]", "src"],
    ["link[rel='stylesheet']", "href"],
    ["link[rel='icon']", "href"],
    ["source[src]", "src"],
    ["video[src]", "src"],
    ["audio[src]", "src"]
  ];

  for (const [selector, attr] of elements) {

    const nodes = [...doc.querySelectorAll(selector)];

    for (const node of nodes) {

      const value = node.getAttribute(attr);
      if (!value) continue;

      const abs = absolute(startUrl, value);

      try {
        const blobURL = await fetchAsBlob(abs);
        node.setAttribute(attr, blobURL);
      } catch (e) {
        console.warn("Failed:", abs);
      }

    }
  }

  // Fix CSS imports
  const styles = [...doc.querySelectorAll("link[rel='stylesheet']")];

  for (const style of styles) {

    const href = style.getAttribute("href");
    if (!href) continue;

    const abs = absolute(startUrl, href);

    try {

      const res = await fetch(abs);
      let css = await res.text();

      const urls = css.match(/url\((.*?)\)/g) || [];

      for (const match of urls) {

        const raw = match.slice(4,-1).replace(/['"]/g,"");
        const absAsset = absolute(abs, raw);

        try {

          const blobURL = await fetchAsBlob(absAsset);
          css = css.replace(raw, blobURL);

        } catch {}

      }

      const cssBlob = new Blob([css], {type:"text/css"});
      const cssURL = URL.createObjectURL(cssBlob);

      style.setAttribute("href", cssURL);

    } catch {}

  }

  const finalHTML = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;

  const pageBlob = new Blob([finalHTML], {type:"text/html"});
  const pageURL = URL.createObjectURL(pageBlob);

  window.open(pageURL);
}

cloneSite("https://coolors.co");
