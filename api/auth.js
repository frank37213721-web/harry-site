// GitHub OAuth — 第 1 步：把使用者導向 GitHub 授權頁
// 需要環境變數：GITHUB_OAUTH_CLIENT_ID
import crypto from "node:crypto";

export default function handler(req, res) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.end("缺少環境變數 GITHUB_OAUTH_CLIENT_ID");
    return;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const redirectUri = `${proto}://${host}/api/callback`;

  const state = crypto.randomUUID();
  res.setHeader(
    "Set-Cookie",
    `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo,user",
    state,
    allow_signup: "false",
  });

  res.statusCode = 302;
  res.setHeader("Location", `https://github.com/login/oauth/authorize?${params}`);
  res.end();
}
