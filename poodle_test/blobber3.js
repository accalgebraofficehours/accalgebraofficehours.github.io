async function packSite(entry) {

  const FS = new Map();
  const queue = [entry];

  const visited = new Set();

  const abs = (base, path) => new URL(path, base).href;

  async function fetchAsset(url) {
    if (visited.has(url)) return;
    visited.add(url);

    const res = await fetch(url);
    const type = res.headers.get("content-type") || "";

    let data;

    if (type.includes("text") || type.includes("javascript") || type.includes("json")) {
      data = await res.text();
    } else {
      const blob = await res.blob();
      data = await blob.arrayBuffer();
    }

    FS.set(url, {type, data});

    if (type.includes("text/html")) {

      const doc = new DOMParser().parseFromString(data, "text/html");

      doc.querySelectorAll("[src],[href]").forEach(el=>{
        const attr = el.hasAttribute("src") ? "src" : "href";
        const val = el.getAttribute(attr);

        if(!val) return;

        const full = abs(url,val);

        if(!visited.has(full))
          queue.push(full);
      });

    }

    if (type.includes("javascript")) {

      const imports = data.match(/import\(["'](.+?)["']\)/g) || [];

      imports.forEach(i=>{
        const path = i.match(/["'](.+?)["']/)[1];
        queue.push(abs(url,path));
      });

    }

    if (type.includes("css")) {

      const urls = data.match(/url\((.*?)\)/g) || [];

      urls.forEach(match=>{
        const asset = match.slice(4,-1).replace(/['"]/g,"");
        queue.push(abs(url,asset));
      });

    }

  }

  while(queue.length)
    await fetchAsset(queue.shift());

  console.log("Downloaded assets:", FS.size);

  const runtime = `
  const FS = new Map();

  const raw = ${JSON.stringify([...FS].map(([k,v])=>[
    k,
    {type:v.type,data:Array.from(new Uint8Array(v.data||[]))}
  ]))};

  for(const [url,obj] of raw){
    if(obj.data.length){
      const buf = new Uint8Array(obj.data).buffer;
      FS.set(url,new Blob([buf],{type:obj.type}));
    }else{
      FS.set(url,new Blob([obj.data],{type:obj.type}));
    }
  }

  const realFetch = window.fetch;

  window.fetch = async function(url){
    const abs = new URL(url,location.href).href;

    if(FS.has(abs)){
      const blob = FS.get(abs);
      return new Response(blob);
    }

    return realFetch(url);
  };

  console.log("Offline runtime ready",FS);
  `;

  const mainHTML = FS.get(entry).data;

  const blob = new Blob([
    "<script>"+runtime+"<\\/script>"+mainHTML
  ],{type:"text/html"});

  const url = URL.createObjectURL(blob);

  window.open(url);

}

packSite("https://coolors.co");
