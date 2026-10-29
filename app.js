const GROUPS = {
  emote: [
    ["E00", "e00-nghi", "Nghỉ", "Thở · nháy mắt · ngó quanh"],
    ["E01", "e01-chao", "Chào", "Vẫy tay mở cuộc trò chuyện"],
    ["E02", "e02-suy-nghi", "Suy nghĩ", "AI đang xử lý câu hỏi"],
    ["E10", "e10-doc-mau", "Đọc mẫu", "Đọc to và giảng bài"],
    ["E39", "e39-ghi-chu", "Ghi chú", "Trả lời dài · ngữ pháp"],
    ["E42", "e42-cham-chu", "Chăm chú", "Người học đang gõ"],
  ],
  avatar: [
    ["A1", "a1-vui", "Vui", "Avatar cạnh tin nhắn"],
    ["A2", "a2-suy-nghi", "Suy nghĩ", "Đang chờ AI"],
    ["A3", "a3-ngac-nhien", "Ngạc nhiên", "Mẹo nhớ · Hán Việt"],
    ["A4", "a4-tiec", "Tiếc", "Lỗi nhẹ · khích lệ"],
  ],
  button: [
    ["N1", "n1-nghi", "Nghỉ", "Trạng thái mặc định"],
    ["N2", "n2-lo-len-chao", "Ló lên chào", "Chào một lần"],
    ["N3", "n3-duoc-cham", "Được chạm", "Phản hồi hover / tap"],
    ["N4", "n4-thut-xuong", "Thụt xuống", "Khi cuộn xuống"],
    ["N5", "n5-lo-lai", "Ló lại", "Khi cuộn lên"],
    ["N6", "n6-co-tin-moi", "Có tin mới", "Bong bóng + chấm đỏ"],
    ["N7", "n7-dang-tra-loi", "Đang trả lời", "Ba chấm theo nhịp"],
  ],
};
for (const group of Object.keys(GROUPS)) GROUPS[group] = GROUPS[group].map(([code, slug, name, desc]) => ({code, slug, name, desc}));
const $ = (selector) => document.querySelector(selector);
const parameters = new URLSearchParams(location.search);
const state = { group: "emote", item: GROUPS.emote.find((item) => item.slug === parameters.get("emote")) || GROUPS.emote[0], clip: "giu", sequence: 0, flow: 0, allowMotion: parameters.get("motion") === "1" };
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let manifest;
const preview = new MascotPlayer($("#mascotPreview"), ({ index, count, progress }) => {
  $("#frameScrubber").value = Math.round(progress * 1000);
  $("#frameLabel").textContent = `Frame ${index + 1} / ${count}`;
});
const chat = new MascotPlayer($("#chatMascot"));
const launcher = new MascotPlayer($("#launcherImage"));

function clipsFor(item = state.item, group = state.group) {
  if (group === "emote") return manifest.emotes[item.slug].clips;
  return [{ ...(group === "avatar" ? manifest.avatars : manifest.buttons)[item.slug], id: "giu" }];
}
function clipFor(item, id, group = "emote") { return clipsFor(item, group).find((clip) => clip.id === id); }
function posterFor(item, group = state.group) {
  if (group === "avatar") return `assets/avatars/png/hanni-fox-${item.slug}@128.png`;
  if (group === "button") return "assets/assistant-button/png/hanni-fox-n1-nghi@256.png";
  return `assets/emotes/png/hanni-fox-${item.slug}@256.png`;
}

function renderList() {
  $("#catalogueCount").textContent = GROUPS[state.group].length;
  $("#assetList").replaceChildren(...GROUPS[state.group].map((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `asset-item ${item.slug === state.item.slug ? "active" : ""}`;
    button.dataset.slug = item.slug;
    button.innerHTML = `<img class="asset-thumb" src="${posterFor(item)}" alt="" /><span class="asset-copy"><strong>${item.name}</strong><span>${item.desc}</span></span><span class="asset-code">${item.code}</span>`;
    button.addEventListener("click", () => { ++state.sequence; state.item = item; state.clip = "giu"; renderList(); renderClips(); playCurrent(); });
    return button;
  }));
}

function renderClips() {
  $("#clipTabs").replaceChildren(...clipsFor().map((clip) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `clip-tab ${clip.id === state.clip ? "active" : ""}`;
    button.dataset.clip = clip.id;
    button.textContent = `${({vao:"Vào",giu:"Giữ",ra:"Ra"})[clip.id] || clip.id.toUpperCase()} · ${clip.duration}s`;
    button.addEventListener("click", () => { ++state.sequence; state.clip = clip.id; renderClips(); playCurrent(); });
    return button;
  }));
}

async function playCurrent(options = {}) {
  const clip = clipFor(state.item, state.clip, state.group);
  $("#previewCode").textContent = state.item.code;
  $("#previewName").textContent = state.item.name;
  $("#mascotPreview").setAttribute("aria-label", `Hanni — ${state.item.code} ${state.item.name}, clip ${state.clip}`);
  $("#clipName").textContent = `${state.clip.toUpperCase()} · ${clip.duration.toFixed(1)}s · ${clip.loop ? "Lặp" : "Một lần"}`;
  $("#pauseButton").textContent = "Tạm dừng";
  await preview.play(clip, options);
  if (reducedMotion.matches && !state.allowMotion) {
    preview.paused = true;
    $("#pauseButton").textContent = "Phát ảnh động";
  }
}

function setGroup(group) {
  ++state.sequence;
  state.group = group;
  state.item = GROUPS[group][0];
  state.clip = "giu";
  document.querySelectorAll(".filter").forEach((button) => button.classList.toggle("active", button.dataset.filter === group));
  renderList(); renderClips(); playCurrent();
}

function playOnce(player, clip, size = 256) {
  return new Promise((resolve, reject) => player.play(clip, { size, loop: false, onEnd: resolve }).then((loaded) => { if (!loaded) resolve(); }).catch(reject));
}
const FLOW = ["e01-chao", "e42-cham-chu", "e02-suy-nghi", "e10-doc-mau", "e39-ghi-chu", "e00-nghi"];
async function runFlow() {
  const ticket = ++state.flow;
  for (let index = 0; index < FLOW.length; index++) {
    if (ticket !== state.flow) return;
    const item = GROUPS.emote.find((entry) => entry.slug === FLOW[index]);
    await Promise.all(clipsFor(item, "emote").filter((clip) => ["vao", "giu", "ra"].includes(clip.id)).map((clip) => MascotPlayer.preload(clip, 256)));
    if (ticket !== state.flow) return;
    $("#chatState").textContent = `${item.code} · ${item.name}`;
    $("#typing").style.display = [2, 3].includes(index) ? "flex" : "none";
    document.querySelectorAll(".flow-step").forEach((element, step) => { element.className = `flow-step ${step < index ? "done" : step === index ? "active" : ""}`; });
    if (clipFor(item, "vao")) await playOnce(chat, clipFor(item, "vao"));
    if (ticket !== state.flow) return;
    await playOnce(chat, clipFor(item, "giu"));
    if (ticket !== state.flow) return;
    if (index === 4 && !$("#flowAnswer")) {
      const answer = document.createElement("div");
      answer.id = "flowAnswer"; answer.className = "message assistant";
      answer.textContent = "学 (xué) nghĩa là học. Bộ 子 gợi hình đứa trẻ học dưới mái nhà — Hanni đã ghi chú lại cho bạn rồi nhé!";
      $("#messages").append(answer);
    }
    if (clipFor(item, "ra")) await playOnce(chat, clipFor(item, "ra"));
  }
  if (ticket === state.flow) await chat.play(clipFor(GROUPS.emote[0], "giu"), { size: 256 });
}

async function init() {
  const response = await fetch("assets/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Không tải được manifest asset");
  manifest = await response.json();
  document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => setGroup(button.dataset.filter)));
  document.querySelectorAll(".surface").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".surface").forEach((entry) => entry.classList.toggle("active", entry === button));
    $("#preview").className = `preview ${button.dataset.surface}`;
  }));
  $("#playButton").addEventListener("click", () => { ++state.sequence; state.allowMotion = true; playCurrent(); });
  $("#pauseButton").addEventListener("click", () => { preview.paused = !preview.paused; if (!preview.paused) state.allowMotion = true; $("#pauseButton").textContent = preview.paused ? "Tiếp tục" : "Tạm dừng"; });
  $("#frameScrubber").addEventListener("input", (event) => { preview.paused = true; preview.seek(Number(event.target.value) / 1000); $("#pauseButton").textContent = "Tiếp tục"; });
  $("#speedSelect").addEventListener("change", (event) => { preview.speed = Number(event.target.value); });
  $("#playFlowButton").addEventListener("click", runFlow);
  $("#sendButton").addEventListener("click", runFlow);
  $("#themeButton").addEventListener("click", () => document.body.classList.toggle("dark-mode"));
  const buttonClip = (slug) => manifest.buttons[slug];
  $("#assistantLauncher").addEventListener("mouseenter", () => launcher.play(buttonClip("n3-duoc-cham"), { size: 256, onEnd: () => launcher.play(buttonClip("n1-nghi"), { size: 256 }) }));
  $("#assistantLauncher").addEventListener("mouseleave", () => launcher.play(buttonClip("n1-nghi"), { size: 256 }));
  $("#assistantLauncher").addEventListener("click", () => { $("#assistantLauncher").classList.remove("has-news"); document.querySelector(".chat-demo").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" }); });
  $("#flowSteps").innerHTML = FLOW.map(() => '<i class="flow-step"></i>').join("");
  renderList(); renderClips();
  await Promise.all([playCurrent(), chat.play(clipFor(GROUPS.emote[0], "giu"), { size: 256 }), launcher.play(buttonClip("n1-nghi"), { size: 256 })]);
  if (reducedMotion.matches && !state.allowMotion) preview.paused = chat.paused = launcher.paused = true;
}
init().catch((error) => { $("#clipName").textContent = "Mở demo qua HTTP: python3 -m http.server 4173"; console.error(error); });
