// GitHub OAuth — 第 2 步：拿 code 換 access token，再回傳給 Decap CMS 視窗
// 需要環境變數：GITHUB_OAUTH_CLIENT_ID、GITHUB_OAUTH_CLIENT_SECRET

export default async function handler(req, res) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.statusCode = 500;
    res.end("缺少 GitHub OAuth 環境變數（GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET）");
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((v) => v.trim().split("="))
      .filter((p) => p[0])
  );

  if (!code || !state || cookies.oauth_state !== state) {
    res.statusCode = 400;
    res.end("OAuth state 不符，請關掉視窗重新登入。");
    return;
  }

  let result;
  let status;
  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await r.json();
    if (data.access_token) {
      result = { token: data.access_token, provider: "github" };
      status = "success";
    } else {
      result = { error: data.error_description || "GitHub 未回傳 access token" };
      status = "error";
    }
  } catch (e) {
    result = { error: String(e && e.message ? e.message : e) };
    status = "error";
  }

  res.setHeader("Set-Cookie", "oauth_state=; Path=/; Max-Age=0");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><meta charset="utf-8">
<body style="font:14px/1.6 system-ui;padding:24px;color:#2a2521">
登入完成，可以關閉這個視窗。
<script>
(function () {
  var payload = "authorization:github:${status}:" + ${JSON.stringify(JSON.stringify(result))};
  function receive(e) {
    if (window.opener) window.opener.postMessage(payload, e.origin);
    window.removeEventListener("message", receive, false);
  }
  window.addEventListener("message", receive, false);
  if (window.opener) window.opener.postMessage("authorizing:github", "*");
  setTimeout(function () { try { window.close(); } catch (_) {} }, 1500);
})();
</script>
</body>`);
}
