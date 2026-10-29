const $ = (selector) => document.querySelector(selector);
const parameters = new URLSearchParams(location.search);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const state = { slug: parameters.get("emote") || "e01-chao", category: "all", allowMotion: parameters.get("motion") === "1", flow: 0 };
let manifest;
let catalogue;
let launcher;
let launcherPreviewIndex = 0;
const player = new MascotPlayer($("#mascotPreview"), ({ index, count, progress }) => {
  $("#frameLabel").textContent = `${index+1} / ${count} frame`;
  $("#frameScrubber").value = Math.round(progress*1000);
  document.querySelectorAll(".frame-thumbnail").forEach((button, position) => button.classList.toggle("active", position === index));
});
const chat = new MascotPlayer($("#chatMascot"));

async function setupLauncher() {
  if (!manifest.launcher_animation) return;
  const launcherPlayer = new MascotPlayer($("#launcherCanvas"));
  try {
    const response = await fetch(manifest.launcher_animation);
    if (!response.ok) throw new Error("Không tải được cử động nút trợ lý");
    const bundle = await response.json();
    launcher = new LauncherIdle(launcherPlayer, bundle, {
      enabled: () => !reducedMotion.matches || state.allowMotion,
      onActivity: (id) => {
        $("#launcherActivity").textContent = { rest:"Nút cáo thỉnh thoảng chào bạn", blink:"Hanni đang nháy mắt", wave:"Hanni đang chào bạn", peek:"Hanni đang ló lên" }[id];
        $("#previewLauncherButton").disabled = id !== "rest";
        $("#assistantLauncher").dataset.gesture = id;
      },
      onError: (error) => console.warn(error),
    });
    await launcher.init();
    $("#launcherImage").hidden = true;
    $("#launcherCanvas").hidden = false;
    reducedMotion.addEventListener("change", () => launcher.refresh());
  } catch (error) {
    launcher?.destroy();
    if (!launcher) launcherPlayer.destroy();
    launcher = null;
    $("#launcherActivity").textContent = "Nút trợ lý đang dùng ảnh tĩnh";
    $("#previewLauncherButton").disabled = true;
    console.warn(error);
  }
}

function itemFor(slug = state.slug) { return manifest.emotes[slug]; }
function clipFor(slug = state.slug) { return itemFor(slug).clips[0]; }

function renderList() {
  const visible = catalogue.filter((item) => state.category === "all" || item.category === state.category);
  $("#catalogueCount").textContent = visible.length;
  $("#assetList").replaceChildren(...visible.map((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.slug = item.slug;
    button.className = `asset-item ${item.slug === state.slug ? "active" : ""}`;
    button.innerHTML = `<img class="asset-thumb" src="${item.poster}" alt="" /><span class="asset-copy"><strong>${item.name}</strong><span>${item.category === "ai" ? "Trợ lý AI" : "Học tiếng Trung"}</span></span><span class="asset-code">${item.code}</span>`;
    button.addEventListener("click", () => selectEmote(item.slug));
    return button;
  }));
}

function renderFrames() {
  const clip = clipFor();
  $("#frameStrip").replaceChildren(...Array.from({length: clip.frames}, (_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "frame-thumbnail";
    button.setAttribute("aria-label", `Xem frame ${index+1}`);
    const img = document.createElement("img");
    img.alt = "";
    img.src = clip.png_frames["256"][index];
    const label = document.createElement("span");
    label.textContent = String(index+1);
    button.append(img, label);
    button.addEventListener("click", () => {
      player.paused = true;
      const previous = clip.durations_ms.slice(0,index).reduce((sum,value) => sum+value, 0);
      player.seek((previous+.01)/(clip.duration*1000));
      $("#pauseButton").textContent = "Tiếp tục";
    });
    return button;
  }));
}

async function playSelected() {
  const item = itemFor();
  const clip = clipFor();
  $("#previewCode").textContent = item.code;
  $("#previewName").textContent = item.name;
  $("#usageDescription").textContent = item.trigger;
  $("#motionDescription").textContent = item.action;
  $("#clipName").textContent = `6 ảnh · ${clip.duration.toFixed(2)}s / vòng`;
  $("#mascotPreview").setAttribute("aria-label", `Hanni ${item.code} — ${item.name}`);
  await player.play(clip);
  player.paused = reducedMotion.matches && !state.allowMotion;
  $("#pauseButton").textContent = player.paused ? "Phát ảnh động" : "Tạm dừng";
}

async function selectEmote(slug) {
  state.slug = slug;
  renderList(); renderFrames();
  await playSelected();
}

async function showChat(slug, text = null) {
  const item = itemFor(slug);
  $("#chatState").textContent = `${item.code} · ${item.name}`;
  $("#typing").hidden = slug !== "e02-suy-nghi";
  if (text) $("#chatResponse").textContent = text;
  await chat.play(clipFor(slug), { size: 256 });
  chat.paused = reducedMotion.matches && !state.allowMotion;
}

const SCENARIOS = [
  { label: "Đang gõ", slug: "e42-cham-chu", text: "Mình đang đọc câu hỏi của bạn…" },
  { label: "Chờ AI", slug: "e02-suy-nghi", text: "Để mình suy nghĩ một chút nhé." },
  { label: "Giải thích", slug: "e10-doc-mau", text: "学 (xué) nghĩa là học. Mình cùng luyện câu 我学习中文 nhé!" },
  { label: "Đúng rồi!", slug: "e04-vui-mung", text: "Đúng rồi! Bạn đã nhớ được chữ 学 🎉" },
  { label: "Làm sai", slug: "e05-co-len", text: "Chưa đúng lần này, nhưng bạn đang tiến bộ. Thử lại cùng mình nhé!" },
  { label: "Ghi chú", slug: "e39-ghi-chu", text: "Mình đã ghi lại mẹo nhớ và ví dụ để bạn ôn lại." },
];

async function runFlow() {
  const ticket = ++state.flow;
  state.allowMotion = true;
  for (const scenario of SCENARIOS) {
    if (ticket !== state.flow) return;
    await showChat(scenario.slug, scenario.text);
    await new Promise((resolve) => { chat.loop = false; chat.onEnd = resolve; });
  }
  if (ticket === state.flow) await showChat("e00-nghi", "Mình ở đây nếu bạn cần giúp thêm nhé.");
}

async function init() {
  const response = await fetch("assets/manifest-v11.json", {cache:"no-store"});
  if (!response.ok) throw new Error("Không tải được bộ emote 6 frame");
  manifest = await response.json();
  catalogue = Object.entries(manifest.emotes).map(([slug,item]) => ({slug,...item}));
  if (!manifest.emotes[state.slug]) state.slug = catalogue[0].slug;
  $("#totalEmotes").textContent = catalogue.length;
  $("#launcherImage").src = manifest.launcher;
  $("#chatAvatar").src = manifest.avatar;
  document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((entry) => entry.classList.toggle("active", entry === button));
    renderList();
  }));
  document.querySelectorAll(".surface").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".surface").forEach((entry) => entry.classList.toggle("active", entry === button));
    $("#preview").className = `preview ${button.dataset.surface}`;
  }));
  $("#playButton").addEventListener("click", () => { state.allowMotion = true; playSelected(); });
  $("#pauseButton").addEventListener("click", () => {
    player.paused = !player.paused;
    if (!player.paused) state.allowMotion = true;
    $("#pauseButton").textContent = player.paused ? "Tiếp tục" : "Tạm dừng";
  });
  $("#frameScrubber").addEventListener("input", (event) => {
    player.paused = true;
    player.seek(Number(event.target.value)/1000);
    $("#pauseButton").textContent = "Tiếp tục";
  });
  $("#speedSelect").addEventListener("change", (event) => { player.speed = Number(event.target.value); });
  $("#themeButton").addEventListener("click", () => document.body.classList.toggle("dark-mode"));
  $("#playFlowButton").addEventListener("click", runFlow);
  $("#sendButton").addEventListener("click", runFlow);
  $("#assistantLauncher").addEventListener("click", () => document.querySelector(".chat-demo").scrollIntoView({behavior:reducedMotion.matches?"auto":"smooth",block:"center"}));
  $("#assistantLauncher").addEventListener("pointerenter", () => { void launcher?.trigger("wave"); });
  $("#previewLauncherButton").addEventListener("click", async () => {
    if (!launcher) return;
    state.allowMotion = true;
    const gestures = ["wave", "peek", "blink"];
    if (await launcher.trigger(gestures[launcherPreviewIndex], {manual:true})) launcherPreviewIndex = (launcherPreviewIndex+1)%gestures.length;
  });
  $("#scenarioButtons").replaceChildren(...SCENARIOS.map((scenario) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "scenario-button"; button.textContent = scenario.label;
    button.addEventListener("click", () => { ++state.flow; state.allowMotion = true; selectEmote(scenario.slug); showChat(scenario.slug, scenario.text); });
    return button;
  }));
  renderList(); renderFrames();
  await Promise.all([playSelected(), showChat("e01-chao"), setupLauncher()]);
}
init().catch((error) => { $("#clipName").textContent = "Chưa tải được emote. Hãy mở demo qua HTTP."; console.error(error); });
