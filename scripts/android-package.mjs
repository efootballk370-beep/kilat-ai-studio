import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Config, ConsoleLog, JdkHelper, KeyTool, TwaGenerator, TwaManifest } from "@bubblewrap/core";

const root = process.cwd();
const androidDir = path.join(root, "android-twa");
const signingDir = path.join(root, ".android-signing");
const downloadDir = path.join(root, "public", "downloads");
const keystorePath = path.join(signingDir, "laju.keystore");
const passwordPath = path.join(signingDir, "password");
const alias = "laju";
const packageId = "id.laju.studio";

async function finalize() {
  const apkSource = path.join(androidDir, "app-release-signed.apk");
  const bundleSource = path.join(androidDir, "app-release-bundle.aab");
  if (!existsSync(apkSource)) throw new Error("APK signed tidak ditemukan. Jalankan bubblewrap build terlebih dahulu.");
  const host = (await fs.readFile(path.join(androidDir, "build-host.txt"), "utf8")).trim();
  await fs.mkdir(downloadDir, { recursive: true });
  const apkTarget = path.join(downloadDir, "Laju-Android.apk");
  await fs.copyFile(apkSource, apkTarget);
  if (existsSync(bundleSource)) await fs.copyFile(bundleSource, path.join(downloadDir, "Laju-Android.aab"));
  const bytes = await fs.readFile(apkTarget);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const metadata = {
    available: true,
    version: "1.0.0",
    packageId,
    host,
    file: "/downloads/Laju-Android.apk",
    size: bytes.byteLength,
    sha256,
    requiresInternet: true,
  };
  await fs.writeFile(path.join(downloadDir, "android.json"), JSON.stringify(metadata, null, 2));
  await fs.writeFile(path.join(downloadDir, "Laju-Android.sha256"), `${sha256}  Laju-Android.apk\n`);
  console.log(`APK ready: ${(bytes.byteLength / 1024 / 1024).toFixed(2)} MB`);
  console.log(`SHA-256: ${sha256}`);
}

async function prepare() {
  const rawUrl = process.env.LAJU_ANDROID_URL;
  if (!rawUrl) throw new Error("LAJU_ANDROID_URL wajib berisi URL HTTPS preview final.");
  const appUrl = new URL(rawUrl);
  if (appUrl.protocol !== "https:") throw new Error("TWA memerlukan URL HTTPS.");
  const iconBaseUrl = process.env.LAJU_ICON_BASE_URL || appUrl.origin;
  const config = await Config.loadConfig(path.join(os.homedir(), ".bubblewrap", "config.json"));
  if (!config) throw new Error("Konfigurasi Bubblewrap tidak ditemukan. Jalankan bubblewrap doctor.");
  await fs.mkdir(signingDir, { recursive: true, mode: 0o700 });
  let password;
  if (existsSync(passwordPath)) password = (await fs.readFile(passwordPath, "utf8")).trim();
  else {
    password = randomBytes(30).toString("base64url");
    await fs.writeFile(passwordPath, password, { mode: 0o600 });
  }
  const jdk = new JdkHelper(process, config);
  const keyTool = new KeyTool(jdk, new ConsoleLog("signing"));
  if (!existsSync(keystorePath)) {
    await keyTool.createSigningKey({
      path: keystorePath,
      alias,
      password,
      keypassword: password,
      fullName: "Laju Studio",
      organizationalUnit: "Creator Tools",
      organization: "Laju",
      country: "ID",
    });
  }
  const keyInfo = await keyTool.keyInfo({ path: keystorePath, alias, password, keypassword: password });
  const fingerprint = keyInfo.fingerprints.get("SHA256");
  if (!fingerprint) throw new Error("Fingerprint SHA-256 tidak dapat dibaca dari keystore.");
  await fs.rm(androidDir, { recursive: true, force: true });
  await fs.mkdir(androidDir, { recursive: true });
  const manifest = new TwaManifest({
    packageId,
    host: appUrl.host,
    name: "Laju — Autonomous Shorts Studio",
    launcherName: "Laju",
    display: "standalone",
    themeColor: "#11130f",
    themeColorDark: "#11130f",
    navigationColor: "#11130f",
    navigationColorDark: "#11130f",
    navigationDividerColor: "#11130f",
    navigationDividerColorDark: "#11130f",
    backgroundColor: "#11130f",
    enableNotifications: false,
    enableSiteSettingsShortcut: true,
    startUrl: "/?source=android-apk",
    iconUrl: `${iconBaseUrl}/pwa-icon/512`,
    maskableIconUrl: `${iconBaseUrl}/pwa-icon/512`,
    splashScreenFadeOutDuration: 350,
    signingKey: { path: keystorePath, alias },
    appVersion: "1.0.0",
    appVersionCode: 1,
    shortcuts: [],
    generatorApp: "Laju Android packaging",
    fallbackType: "webview",
    features: {},
    minSdkVersion: 24,
    fingerprints: [{ name: "Laju direct install", value: fingerprint }],
    additionalTrustedOrigins: [],
  });
  const validationError = manifest.validate();
  if (validationError) throw new Error(validationError);
  const manifestPath = path.join(androidDir, "twa-manifest.json");
  await manifest.saveToFile(manifestPath);
  await new TwaGenerator().createTwaProject(androidDir, manifest, new ConsoleLog("android-project"));
  const checksum = createHash("sha1").update(await fs.readFile(manifestPath)).digest("hex");
  await fs.writeFile(path.join(androidDir, "manifest-checksum.txt"), checksum);
  const assetLinks = [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: packageId, sha256_cert_fingerprints: [fingerprint] },
  }];
  await fs.mkdir(path.join(root, "public", ".well-known"), { recursive: true });
  await fs.writeFile(path.join(root, "public", ".well-known", "assetlinks.json"), JSON.stringify(assetLinks, null, 2));
  await fs.writeFile(path.join(signingDir, "fingerprint.sha256"), `${fingerprint}\n`);
  await fs.writeFile(path.join(androidDir, "build-host.txt"), appUrl.host);
  console.log(`Android project prepared for ${appUrl.origin}`);
  console.log(`Signing fingerprint: ${fingerprint}`);
}

if (process.argv.includes("--finalize")) await finalize();
else await prepare();
