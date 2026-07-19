/* 困在屏幕里的人 — interactions */
(function () {
  "use strict";

  const scrollRoot = document.scrollingElement || document.documentElement;
  const observerRoot = null; // 视口滚动

  /* ---------- Lock horizontal pan / trackpad swipe ---------- */
  window.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  let touchStartX = 0;
  let touchStartY = 0;
  window.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches[0]) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (!e.touches[0]) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > dy && dx > 8) e.preventDefault();
    },
    { passive: false }
  );

  /* ---------- Cursor spotlight ---------- */
  const dot = document.getElementById("cursorDot");
  const glow = document.getElementById("cursorGlow");
  let mx = 0, my = 0, gx = 0, gy = 0;

  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot) {
        dot.style.left = mx + "px";
        dot.style.top = my + "px";
      }
    });
    (function loop() {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      if (glow) {
        glow.style.left = gx + "px";
        glow.style.top = gy + "px";
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Progress bar ---------- */
  const bar = document.getElementById("progressBar");
  function updateProgress() {
    const h = scrollRoot.scrollHeight - window.innerHeight;
    const p = h > 0 ? (window.scrollY / h) * 100 : 0;
    if (bar) bar.style.width = p + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------- Lift titles so sticky covers whole chapter ---------- */
  document.querySelectorAll(".page-section").forEach((sec) => {
    if (sec.id === "closing" || sec.id === "hero" || sec.id === "intro" || sec.id === "interact") return;
    const row = sec.querySelector(".section-title-row");
    const title = sec.querySelector(".section-title");
    const lift = row || title;
    if (!lift) return;
    if (title) title.classList.remove("reveal", "in");
    if (lift.parentElement !== sec) {
      sec.insertBefore(lift, sec.firstChild);
    }
  });

  /* ---------- Chapter title reflection (below, touching text) ---------- */
  document.querySelectorAll("#ch1, #ch2, #ch3, #ch4").forEach((sec) => {
    const title = sec.querySelector(".section-title");
    if (!title || title.querySelector(".section-title-stack")) return;
    const stack = document.createElement("span");
    stack.className = "section-title-stack";
    const face = document.createElement("span");
    face.className = "section-title-face";
    while (title.firstChild) face.appendChild(title.firstChild);
    const reflect = face.cloneNode(true);
    reflect.className = "section-title-reflect";
    reflect.setAttribute("aria-hidden", "true");
    reflect.querySelectorAll(".ch1-spotlight, .ch2-blackhole, .ch3-cage, .ch4-mirror").forEach((el) => el.remove());
    stack.appendChild(face);
    stack.appendChild(reflect);
    title.appendChild(stack);
  });

  /* ---------- Reveal on scroll ---------- */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          revealObs.unobserve(en.target);
        }
      });
    },
    { root: observerRoot, threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal, .reveal-line, .slide-left, .slide-right").forEach((el, i) => {
    if (el.classList.contains("reveal-line")) {
      el.style.transitionDelay = (i % 6) * 0.08 + "s";
    }
    revealObs.observe(el);
  });

  /* ---------- Chart image draw-in ---------- */
  const CHART_SEL = ".chart-draw-x, .chart-draw-y, .chart-draw-pie";

  function growChart(el) {
    if (!el || el.classList.contains("drawn")) return;
    if (el.matches(CHART_SEL)) {
      void el.offsetWidth;
      el.classList.add("drawn");
    }
  }

  const chartObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        growChart(en.target);
        en.target.querySelectorAll(CHART_SEL).forEach(growChart);
        chartObs.unobserve(en.target);
      });
    },
    { root: observerRoot, threshold: 0.22, rootMargin: "0px 0px -6% 0px" }
  );

  document.querySelectorAll(`${CHART_SEL}, .chart-pair`).forEach((el) => {
    chartObs.observe(el);
  });

  /* ---------- Count-up ---------- */
  function animateCount(el, target, duration, suffix) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(target * eased);
      el.textContent = val.toLocaleString("zh-CN") + (suffix || "");
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const countObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        if (!isNaN(target)) animateCount(el, target, 1400, suffix);
        countObs.unobserve(el);
      });
    },
    { root: observerRoot, threshold: 0.4 }
  );
  document.querySelectorAll("[data-count]").forEach((el) => countObs.observe(el));

  /* ---------- Command bubbles ---------- */
  const cmdBlock = document.getElementById("cmdBubbles");
  if (cmdBlock) {
    const bubbleObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.querySelectorAll(".bubble").forEach((b, i) => {
            setTimeout(() => b.classList.add("in"), i * 280);
          });
          bubbleObs.unobserve(en.target);
        });
      },
      { root: observerRoot, threshold: 0.35 }
    );
    bubbleObs.observe(cmdBlock);
  }

  /* ---------- Recruit screenshot stack ---------- */
  const recruitStack = document.getElementById("recruitStack");
  if (recruitStack) {
    const recruitObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          requestAnimationFrame(() => {
            recruitStack.classList.add("is-on");
          });
          recruitObs.unobserve(en.target);
        });
      },
      { root: observerRoot, threshold: 0.28, rootMargin: "0px 0px -8% 0px" }
    );
    recruitObs.observe(recruitStack);

    // 仅左右拖动滑动；纵向滚轮交给页面，不再转成横滑
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    recruitStack.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startScroll = recruitStack.scrollLeft;
      recruitStack.classList.add("is-dragging");
      try { recruitStack.setPointerCapture(e.pointerId); } catch (_) {}
    });
    recruitStack.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      // 只有明显左右移动时才横向滚动，避免轻微抖动
      if (Math.abs(dx) < 2) return;
      recruitStack.scrollLeft = startScroll - dx;
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      recruitStack.classList.remove("is-dragging");
      try { recruitStack.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    recruitStack.addEventListener("pointerup", endDrag);
    recruitStack.addEventListener("pointercancel", endDrag);
    // 只响应横向滚轮 / Shift+滚轮，不劫持上下滚动
    recruitStack.addEventListener(
      "wheel",
      (e) => {
        const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
        if (!horizontal) return;
        if (recruitStack.scrollWidth <= recruitStack.clientWidth + 4) return;
        recruitStack.scrollLeft += e.shiftKey ? e.deltaY : e.deltaX;
        e.preventDefault();
      },
      { passive: false }
    );
  }

  /* ---------- AI rows ---------- */
  const aiList = document.getElementById("aiList");
  if (aiList) {
    const aiObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          aiList.classList.add("is-animating");
          void aiList.offsetWidth;
          en.target.querySelectorAll(".ai-row").forEach((row, i) => {
            setTimeout(() => row.classList.add("in"), i * 220);
          });
          aiObs.unobserve(en.target);
        });
      },
      { root: observerRoot, threshold: 0.15 }
    );
    aiObs.observe(aiList);
  }

  /* ---------- Job tabs ---------- */
  const jobTabs = document.getElementById("jobTabs");
  if (jobTabs) {
    jobTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      jobTabs.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      const panel = document.getElementById("tab-" + btn.dataset.tab);
      if (panel) panel.classList.add("active");
      requestAnimationFrame(() => {
        document.querySelectorAll(`.tab-panel.active ${CHART_SEL}`).forEach(growChart);
      });
    });
  }

  /* ---------- Case cards ---------- */
  document.querySelectorAll("[data-case]").forEach((card) => {
    const head = card.querySelector(".case-head");
    if (!head) return;
    head.addEventListener("click", () => {
      const open = card.classList.contains("open");
      document.querySelectorAll("[data-case]").forEach((c) => c.classList.remove("open"));
      if (!open) card.classList.add("open");
    });
  });

  /* ---------- Quiz ---------- */
  const quiz = document.getElementById("quiz");
  const answers = [0, 0, 0, 0, 0, 0, 0];
  if (quiz) {
    quiz.querySelectorAll(".quiz-q").forEach((q) => {
      const scale = q.querySelector(".quiz-scale");
      const qi = Number(q.dataset.q);
      for (let s = 1; s <= 5; s++) {
        const label = document.createElement("label");
        label.textContent = String(s);
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "q" + qi;
        input.value = String(s);
        label.prepend(input);
        label.addEventListener("click", () => {
          scale.querySelectorAll("label").forEach((l) => l.classList.remove("active"));
          label.classList.add("active");
          answers[qi] = s;
        });
        scale.appendChild(label);
      }
    });
  }

  const quizSubmit = document.getElementById("quizSubmit");
  if (quizSubmit) {
    quizSubmit.addEventListener("click", () => {
      if (answers.some((a) => a === 0)) {
        alert("请完成全部 7 道自评题");
        return;
      }
      const sum = answers.reduce((a, b) => a + b, 0);
      const result = document.getElementById("quizResult");
      document.getElementById("quizScore").textContent = sum + " / 35";
      const verdict = document.getElementById("quizVerdict");
      const desc = document.getElementById("quizDesc");
      if (sum >= 28) {
        verdict.textContent = "「天选主播」";
        desc.textContent = "你对高强度情绪劳动与不确定收入的耐受度极高——但请记住，耐受不等于应当承受。行业结构问题不会因个人韧性而消失。";
      } else if (sum >= 14) {
        verdict.textContent = "「普通人」";
        desc.textContent = "你具备一定适应力，但团播流水线对身心的消耗可能超出预期。进入前请仔细阅读合同，尤其是违约金与分成条款。";
      } else {
        verdict.textContent = "「不要靠近团播」";
        desc.textContent = "以你的自评，团播主播工作很可能严重侵蚀生活质量。这不是能力问题，而是边界清晰——保护自己，是更理性的选择。";
      }
      result.classList.add("show");
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  /* ---------- Income calculator ---------- */
  const fans = document.getElementById("fans");
  const hours = document.getElementById("hours");
  const calcResult = document.getElementById("calcResult");

  function updateCalc() {
    if (!fans || !hours || !calcResult) return;
    const f = Number(fans.value) || 0;
    const h = Number(hours.value) || 0;
    const income = Math.round(f * 0.03 * h * 30 * 0.2);
    calcResult.textContent = "¥" + income.toLocaleString("zh-CN");
  }

  if (fans) fans.addEventListener("input", updateCalc);
  if (hours) hours.addEventListener("input", updateCalc);
  updateCalc();

  /* ---------- Ensure end credits exist & scrollable ---------- */
  (function ensureCredits() {
    const lines = [
      "团队成员：温田卓 曹欣仪 吴昊 李名可",
      "指导老师：刘淼",
      "北京师范大学新闻传播学院"
    ];
    const closing = document.getElementById("closing");
    let box = document.getElementById("siteCredits");
    if (!box) {
      box = document.createElement("div");
      box.id = "siteCredits";
      box.className = "site-credits";
      lines.forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        box.appendChild(p);
      });
      if (closing) closing.appendChild(box);
      else (document.getElementById("siteShell") || document.body).appendChild(box);
    }
    // 强制可见
    box.hidden = false;
    box.removeAttribute("hidden");
    box.style.setProperty("display", "block", "important");
    box.style.setProperty("visibility", "visible", "important");
    box.style.setProperty("opacity", "1", "important");
    box.style.setProperty("color", "#ffffff", "important");
    box.style.setProperty("min-height", "160px", "important");
    box.querySelectorAll("p").forEach((p) => {
      p.style.setProperty("color", "#ffffff", "important");
      p.style.setProperty("opacity", "1", "important");
    });
  })();
})();
