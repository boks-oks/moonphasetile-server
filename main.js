export default {
  async fetch(request, env) {
    const auth = btoa(`${env.API_KEY}:${env.API_SECRET}`);

    const body = {
      format: "png",
      observer: { latitude: 0, longitude: 0, date: new Date().toISOString() },
      view: { type: "portrait-simple", orientation: "north-up" },
      style: {
        moonStyle: "default",
        backgroundStyle: "solid",
        backgroundColor: "#000000",
        headingColor: "#000000",
        textColor: "#000000"
      }
    };

    const apiResp = await fetch("https://api.astronomyapi.com/api/v2/studio/moon-phase", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      return new Response(`{ "error": "astroapi failed", "detail": ${JSON.stringify(errText)} }`, {
        headers: { "Content-Type": "application/json" }, status: 502
      });
    }

    const apiJson = await apiResp.json();
    const srcUrl = apiJson?.data?.imageUrl;
    if (!srcUrl) {
      return new Response(JSON.stringify({ error: "no imageUrl returned" }), {
        headers: { "Content-Type": "application/json" }, status: 502
      });
    }

    let srcNoScheme = srcUrl.replace(/^https?:\/\//i, "");
    const encoded = encodeURIComponent(srcNoScheme); // encode for xml
    const weservUrl = `https://images.weserv.nl/?url=${encoded}&w=500&h=500&fit=cover&output=png`;

    function buildWeservUrl(src, width, height, options = {}) {
      const srcNoScheme = src.replace(/^https?:\/\//, "");
      const encoded = encodeURIComponent(srcNoScheme);
    
      let params = [`w=${width}`, `h=${height}`];
    
      if (options.fit) params.push(`fit=${options.fit}`);
      if (options.bg) params.push(`bg=${options.bg}`);
      if (options.anchor) params.push(`a=${options.anchor}`);
    
      return `https://images.weserv.nl/?url=${encoded}&${params.join("&")}`;
    }
    
    function xmlEscapeUrl(url) {
      return url.replace(/&/g, "&amp;");
    }
    
    const wideUrl = xmlEscapeUrl(buildWeservUrl(srcUrl, 310, 150, { fit: "contain", bg: "000000" }));
    const sq150Url = xmlEscapeUrl(buildWeservUrl(srcUrl, 150, 150, { fit: "cover", anchor: "top" }));
    const sq71Url = xmlEscapeUrl(buildWeservUrl(srcUrl, 71, 71, { fit: "cover", anchor: "top" }));    
        
    const xml = `
<tile>
  <visual version="3">
    <binding template="TileWide310x150Image">
      <image id="1" src="${wideUrl}" alt="Moon Phase"/>
    </binding>
    <binding template="TileSquare150x150Image">
      <image id="1" src="${sq150Url}" alt="Moon Phase"/>
    </binding>
    <binding template="TileSquare71x71Image">
      <image id="1" src="${sq71Url}" alt="Moon Phase"/>
    </binding>
  </visual>
</tile>`.trim();
    
    return new Response(xml, {
      headers: { "Content-Type": "text/xml", "Cache-Control": "max-age=3600" }
    });
  }
};
