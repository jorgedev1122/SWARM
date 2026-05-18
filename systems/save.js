(function () {
  "use strict";

  async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GET ${url} failed`);
    return response.json();
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`POST ${url} failed`);
    return response.json();
  }

  window.SWARM.save = {
    getJson,
    postJson
  };
})();
