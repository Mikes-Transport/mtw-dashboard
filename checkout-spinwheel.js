console.log("🔥 MTW SPIN WHEEL — NEW VERSION LOADED 🔥");

'use strict';

(function () {

  const rewards = [
    { label: "10% OFF", value: "10% OFF", code: "SPIN-10" },
    { label: "FREE FREIGHT", value: "Free Freight", code: "SPIN-FREIGHT" },
    { label: "$20 VOUCHER", value: "$20 Voucher", code: "SPIN-20" },
    { label: "TRY AGAIN", value: "Try Again", code: null },
    { label: "15% OFF", value: "15% OFF", code: "SPIN-15" },
    { label: "FREE GIFT", value: "Free Gift", code: "SPIN-GIFT" },
    { label: "$50 VOUCHER", value: "$50 Voucher", code: "SPIN-50" },
    { label: "5% OFF", value: "5% OFF", code: "SPIN-5" }
  ];

  const colours = [
    "#111111",
    "#65b746",
    "#f4f4f4",
    "#222222",
    "#65b746",
    "#f4f4f4",
    "#111111",
    "#65b746"
  ];

  const STORAGE_KEY = "mtw_spin_wheel_used";

  let currentRotation = 0;
  let spinning = false;

  const root = document.getElementById("mtw-spin-wheel");

  if (!root) return;

  /*
   * Build the wheel background.
   * Using conic-gradient avoids the previous
   * CSS sin/cos segment issue completely.
   */
  const slice = 360 / rewards.length;

  const gradientStops = rewards.map((_, i) => {
    const start = i * slice;
    const end = (i + 1) * slice;
    return `${colours[i]} ${start}deg ${end}deg`;
  }).join(", ");

  root.innerHTML = `
    <div class="mtw-spin-wrap">

      <div class="mtw-wheel-stage">

        <div class="mtw-light-ring">
          ${Array.from({ length: 32 }, (_, i) =>
            `<span style="--light:${i};"></span>`
          ).join("")}
        </div>

        <div class="mtw-wheel-shadow"></div>

        <div class="mtw-pointer">
          <div class="mtw-pointer-glow"></div>
        </div>

        <div
          class="mtw-wheel"
          id="mtw-wheel"
          style="--wheel-gradient: conic-gradient(from 0deg, ${gradientStops});"
        >

          <div class="mtw-segment-lines">
            ${rewards.map((_, i) => `
              <span
                style="
                  transform:
                    rotate(${i * slice}deg)
                    translateY(-50%);
                "
              ></span>
            `).join("")}
          </div>

          <div class="mtw-labels">
            ${rewards.map((reward, i) => {

              const centre = i * slice + slice / 2;

              return `
                <div
                  class="mtw-label"
                  style="
                    transform:
                      translate(-50%, -50%)
                      rotate(${centre}deg)
                      translateY(-135px);
                  "
                >
                  <span>${reward.label}</span>
                </div>
              `;

            }).join("")}
          </div>

          <div class="mtw-wheel-inner-ring"></div>

          <div class="mtw-wheel-centre">
            <div class="mtw-centre-ring"></div>
            <span>SPIN</span>
          </div>

        </div>

      </div>

      <button
        type="button"
        class="mtw-spin-button"
        id="mtw-spin-button"
      >
        <span class="mtw-button-top">SPIN THE WHEEL</span>
        <span class="mtw-button-bottom">WIN SOMETHING!</span>
      </button>

      <div
        class="mtw-spin-status"
        id="mtw-spin-status"
      ></div>

    </div>
  `;

  const style = document.createElement("style");

  style.textContent = `

    #mtw-spin-wheel {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      font-family: inherit;
      box-sizing: border-box;
    }

    #mtw-spin-wheel *,
    #mtw-spin-wheel *::before,
    #mtw-spin-wheel *::after {
      box-sizing: border-box;
    }

    .mtw-spin-wrap {
      width: 100%;
      text-align: center;
      padding: 25px 10px 35px;
    }

    /* =========================
       WHEEL STAGE
       ========================= */

    .mtw-wheel-stage {
      position: relative;
      width: min(88vw, 560px);
      height: min(88vw, 560px);
      margin: 0 auto 35px;

      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mtw-wheel-shadow {
      position: absolute;
      width: 86%;
      height: 86%;

      border-radius: 50%;

      background: rgba(0, 0, 0, .55);

      filter: blur(18px);

      transform: translateY(18px);

      z-index: 0;
    }

    /* =========================
       GAME SHOW LIGHTS
       ========================= */

    .mtw-light-ring {
      position: absolute;
      inset: 0;

      z-index: 10;

      pointer-events: none;

      border-radius: 50%;
    }

    .mtw-light-ring span {
      position: absolute;

      width: 13px;
      height: 13px;

      border-radius: 50%;

      background: #ffd84a;

      box-shadow:
        0 0 5px #fff4a3,
        0 0 12px #ffb300,
        0 0 24px rgba(255, 166, 0, .9);

      left: calc(
        50% + 47% * cos(calc(var(--light) * 11.25deg))
      );

      top: calc(
        50% + 47% * sin(calc(var(--light) * 11.25deg))
      );

      transform: translate(-50%, -50%);

      animation:
        mtwBulbIdle 1.1s infinite alternate;

      animation-delay:
        calc(var(--light) * -.035s);
    }

    @keyframes mtwBulbIdle {

      0% {
        opacity: .45;
        transform:
          translate(-50%, -50%)
          scale(.78);
      }

      100% {
        opacity: 1;
        transform:
          translate(-50%, -50%)
          scale(1);
      }

    }

    .mtw-wheel-stage.mtw-spinning
    .mtw-light-ring span {

      animation:
        mtwBulbSpin .16s infinite alternate;

    }

    @keyframes mtwBulbSpin {

      0% {
        opacity: .3;
        background: #ff9d00;

        box-shadow:
          0 0 4px #ffb300,
          0 0 10px #ff7b00;
      }

      100% {
        opacity: 1;
        background: #fff36a;

        box-shadow:
          0 0 7px #ffffff,
          0 0 18px #ffb300,
          0 0 32px rgba(255, 128, 0, .95);
      }

    }

    /* =========================
       WHEEL
       ========================= */

    .mtw-wheel {

      position: relative;

      width: 88%;
      height: 88%;

      border-radius: 50%;

      overflow: hidden;

      z-index: 3;

      border: 10px solid #161616;

      background:
        var(--wheel-gradient);

      box-shadow:

        0 0 0 4px rgba(255,255,255,.12),

        0 0 0 8px rgba(101,183,70,.45),

        0 12px 28px rgba(0,0,0,.45),

        inset 0 0 35px rgba(0,0,0,.55);

      transform: rotate(0deg);

      transition:
        transform 4.1s cubic-bezier(.08,.78,.12,1);
    }

    /*
     * Subtle gloss only.
     * No translucent band across the segments.
     */

    .mtw-wheel::after {

      content: "";

      position: absolute;

      inset: 0;

      border-radius: 50%;

      background:
        radial-gradient(
          circle at 35% 22%,
          rgba(255,255,255,.17),
          transparent 27%
        );

      pointer-events: none;

      z-index: 8;
    }

    /* =========================
       SEGMENT DIVIDERS
       ========================= */

    .mtw-segment-lines {

      position: absolute;

      inset: 0;

      z-index: 5;

      pointer-events: none;
    }

    .mtw-segment-lines span {

      position: absolute;

      width: 2px;

      height: 50%;

      top: 50%;
      left: calc(50% - 1px);

      transform-origin:
        50% 0;

      background:
        rgba(255,255,255,.35);

      box-shadow:
        0 0 2px rgba(0,0,0,.5);
    }

    /* =========================
       RADIAL LABELS
       ========================= */

    .mtw-labels {

      position: absolute;

      inset: 0;

      z-index: 6;

      pointer-events: none;
    }

    .mtw-label {

      position: absolute;

      top: 50%;
      left: 50%;

      width: 90px;
      height: 150px;

      display: flex;

      align-items: center;
      justify-content: center;

      transform-origin:
        center center;
    }

    .mtw-label span {

      display: block;

      width: 100%;

      text-align: center;

      font-size:
        clamp(10px, 2.35vw, 16px);

      font-weight: 1000;

      line-height: 1.05;

      letter-spacing: .3px;

      color: #ffffff;

      text-shadow:
        0 2px 4px rgba(0,0,0,.9),
        0 0 3px rgba(0,0,0,.7);

      /*
       * Text stays vertical/radial.
       */

      writing-mode: vertical-rl;

      text-orientation:
        mixed;

      transform:
        rotate(180deg);
    }

    /*
     * Dark text on the white segments.
     */

    .mtw-label:nth-child(3) span,
    .mtw-label:nth-child(6) span {

      color: #171717;

      text-shadow: none;
    }

    /* =========================
       INNER RING
       ========================= */

    .mtw-wheel-inner-ring {

      position: absolute;

      inset: 8%;

      border-radius: 50%;

      border:
        3px solid rgba(255,255,255,.2);

      box-shadow:

        inset 0 0 15px rgba(0,0,0,.4),

        0 0 8px rgba(0,0,0,.35);

      z-index: 9;

      pointer-events: none;
    }

    /* =========================
       CENTRE
       ========================= */

    .mtw-wheel-centre {

      position: absolute;

      z-index: 12;

      top: 50%;
      left: 50%;

      width: 112px;
      height: 112px;

      transform:
        translate(-50%, -50%);

      border-radius: 50%;

      background:
        radial-gradient(
          circle at 35% 30%,
          #8bdd69,
          #65b746 45%,
          #3c8d27 100%
        );

      border:
        7px solid #171717;

      display: flex;

      align-items: center;
      justify-content: center;

      box-shadow:

        0 4px 8px rgba(0,0,0,.45),

        0 0 20px rgba(101,183,70,.5),

        inset
          0 2px 4px rgba(255,255,255,.35);
    }

    .mtw-wheel-stage.mtw-spinning
    .mtw-wheel-centre {

      animation:
        mtwCentrePulse .45s infinite alternate;
    }

    @keyframes mtwCentrePulse {

      from {
        transform:
          translate(-50%, -50%)
          scale(1);
      }

      to {
        transform:
          translate(-50%, -50%)
          scale(1.07);
      }

    }

    .mtw-centre-ring {

      position: absolute;

      inset: 7px;

      border-radius: 50%;

      border:
        2px solid rgba(255,255,255,.3);
    }

    .mtw-wheel-centre span {

      position: relative;

      z-index: 2;

      font-size: 19px;

      font-weight: 1000;

      letter-spacing: .8px;

      color: #ffffff;

      text-shadow:
        0 2px 3px rgba(0,0,0,.45);
    }

    /* =========================
       POINTER
       ========================= */

    .mtw-pointer {

      position: absolute;

      z-index: 20;

      top: -3px;
      left: 50%;

      transform:
        translateX(-50%);

      width: 0;
      height: 0;

      border-left:
        23px solid transparent;

      border-right:
        23px solid transparent;

      border-top:
        48px solid #171717;

      filter:
        drop-shadow(
          0 4px 3px rgba(0,0,0,.35)
        );
    }

    .mtw-pointer::after {

      content: "";

      position: absolute;

      left: -14px;
      top: -44px;

      width: 28px;
      height: 36px;

      clip-path:
        polygon(
          50% 100%,
          0 0,
          100% 0
        );

      background: #65b746;

      filter:
        drop-shadow(
          0 0 7px
          rgba(101,183,70,.8)
        );
    }

    .mtw-pointer-glow {

      position: absolute;

      width: 60px;
      height: 60px;

      left: -30px;
      top: -20px;

      border-radius: 50%;

      background:
        rgba(101,183,70,.2);

      filter: blur(15px);
    }

    /* =========================
       BUTTON
       ========================= */

    .mtw-spin-button {

      appearance: none;

      border: 0;

      position: relative;

      min-width: 250px;

      padding: 16px 34px;

      border-radius: 12px;

      background:
        linear-gradient(
          180deg,
          #78ca59 0%,
          #65b746 48%,
          #4b9b32 100%
        );

      color: #ffffff;

      font-family: inherit;

      cursor: pointer;

      box-shadow:

        0 5px 0 #377c24,

        0 8px 20px rgba(0,0,0,.2),

        0 0 18px
        rgba(101,183,70,.35);

      transition:
        transform .15s ease,
        box-shadow .15s ease,
        filter .15s ease;
    }

    .mtw-spin-button:hover:not(:disabled) {

      transform:
        translateY(-2px);

      box-shadow:

        0 7px 0 #377c24,

        0 12px 25px rgba(0,0,0,.25),

        0 0 25px
        rgba(101,183,70,.55);

      filter:
        brightness(1.08);
    }

    .mtw-spin-button:active:not(:disabled) {

      transform:
        translateY(3px);

      box-shadow:

        0 2px 0 #377c24,

        0 5px 12px rgba(0,0,0,.2);
    }

    .mtw-spin-button:disabled {

      opacity: .65;

      cursor: not-allowed;

      transform: none;
    }

    .mtw-button-top {

      display: block;

      font-size: 17px;

      font-weight: 1000;

      letter-spacing: .4px;
    }

    .mtw-button-bottom {

      display: block;

      margin-top: 2px;

      font-size: 11px;

      font-weight: 700;

      opacity: .9;

      letter-spacing: 1px;
    }

    /* =========================
       STATUS
       ========================= */

    .mtw-spin-status {

      min-height: 40px;

      margin-top: 22px;

      font-size:
        clamp(18px, 4vw, 25px);

      font-weight: 1000;

      letter-spacing: .3px;
    }

    .mtw-spin-status.win {

      color: #65b746;

      animation:
        mtwWinReveal .6s ease both;
    }

    .mtw-spin-status.try-again {

      color: #171717;

      animation:
        mtwResultReveal .5s ease both;
    }

    @keyframes mtwWinReveal {

      0% {
        opacity: 0;
        transform: scale(.5);
      }

      60% {
        opacity: 1;
        transform: scale(1.15);
      }

      100% {
        transform: scale(1);
      }

    }

    @keyframes mtwResultReveal {

      0% {
        opacity: 0;
        transform:
          translateY(10px);
      }

      100% {
        opacity: 1;
        transform:
          translateY(0);
      }

    }

    /* =========================
       WINNER LIGHTS
       ========================= */

    .mtw-wheel-stage.mtw-winner
    .mtw-light-ring span {

      animation:
        mtwWinnerLights .22s infinite alternate;
    }

    .mtw-wheel-stage.mtw-winner
    .mtw-wheel {

      box-shadow:

        0 0 0 4px
        rgba(255,255,255,.15),

        0 0 0 9px
        rgba(101,183,70,.75),

        0 0 35px
        rgba(101,183,70,.75),

        0 0 70px
        rgba(101,183,70,.35),

        inset
        0 0 30px
        rgba(0,0,0,.65);
    }

    @keyframes mtwWinnerLights {

      0% {

        opacity: .3;

        background: #ff8a00;

        transform:
          translate(-50%, -50%)
          scale(.75);
      }

      100% {

        opacity: 1;

        background: #fff36a;

        transform:
          translate(-50%, -50%)
          scale(1.25);
      }

    }

    /* =========================
       MOBILE
       ========================= */

    @media (max-width: 480px) {

      .mtw-spin-wrap {

        padding-left: 5px;
        padding-right: 5px;
      }

      .mtw-wheel-stage {

        width: 94vw;
        height: 94vw;
      }

      .mtw-wheel {

        border-width: 7px;
      }

      .mtw-light-ring span {

        width: 9px;
        height: 9px;
      }

      .mtw-wheel-centre {

        width: 82px;
        height: 82px;

        border-width: 5px;
      }

      .mtw-wheel-centre span {

        font-size: 14px;
      }

      .mtw-label {

        width: 62px;
        height: 105px;
      }

      .mtw-label span {

        font-size: 9px;
      }

      .mtw-pointer {

        border-left-width: 17px;
        border-right-width: 17px;
        border-top-width: 36px;
      }

      .mtw-spin-button {

        width: 90%;
        max-width: 300px;
      }

    }

  `;

  document.head.appendChild(style);

  /* =========================
     PRIZE TEXTAREA
     ========================= */

  let prizePrefix = "";

  function getPrizeInput() {

    return document.querySelector(
      "textarea.input-block-level.form-control.mb-3"
    );
  }

  function protectPrizeInTextarea(reward) {

    const input = getPrizeInput();

    if (!input || !reward) return;

    prizePrefix =
      `MTW SPIN WHEEL PRIZE: ${reward.value}\n\n`;

    let existingComments =
      input.value || "";

    if (
      existingComments.startsWith(
        "MTW SPIN WHEEL PRIZE:"
      )
    ) {

      existingComments =
        existingComments.replace(
          /^MTW SPIN WHEEL PRIZE:[^\n]*(?:\n\n)?/,
          ""
        );
    }

    input.value =
      prizePrefix +
      existingComments;

    input.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );

    input.dispatchEvent(
      new Event("change", {
        bubbles: true
      })
    );

    input.addEventListener(
      "keydown",
      function (event) {

        const start =
          input.selectionStart;

        const end =
          input.selectionEnd;

        if (
          start < prizePrefix.length ||
          end < prizePrefix.length
        ) {

          if (
            event.key === "Backspace" ||
            event.key === "Delete"
          ) {

            event.preventDefault();

            input.setSelectionRange(
              prizePrefix.length,
              prizePrefix.length
            );
          }
        }

      }
    );

    input.addEventListener(
      "beforeinput",
      function (event) {

        const start =
          input.selectionStart;

        const end =
          input.selectionEnd;

        if (
          start < prizePrefix.length ||
          end < prizePrefix.length
        ) {

          event.preventDefault();

          input.setSelectionRange(
            prizePrefix.length,
            prizePrefix.length
          );
        }

      }
    );

    input.addEventListener(
      "input",
      function () {

        if (
          !input.value.startsWith(
            prizePrefix
          )
        ) {

          let value =
            input.value || "";

          value =
            value.replace(
              /^MTW SPIN WHEEL PRIZE:[^\n]*(?:\n\n)?/,
              ""
            );

          input.value =
            prizePrefix +
            value;
        }

      }
    );

    input.addEventListener(
      "paste",
      function () {

        setTimeout(
          function () {

            if (
              !input.value.startsWith(
                prizePrefix
              )
            ) {

              let value =
                input.value || "";

              value =
                value.replace(
                  /^MTW SPIN WHEEL PRIZE:[^\n]*(?:\n\n)?/,
                  ""
                );

              input.value =
                prizePrefix +
                value;
            }

          },
          0
        );

      }
    );

    input.addEventListener(
      "cut",
      function (event) {

        const start =
          input.selectionStart;

        const end =
          input.selectionEnd;

        if (
          start < prizePrefix.length ||
          end < prizePrefix.length
        ) {

          event.preventDefault();

          input.setSelectionRange(
            prizePrefix.length,
            prizePrefix.length
          );
        }

      }
    );
  }

  /* =========================
     ONE SPIN
     ========================= */

  function alreadyUsed() {

    return (
      localStorage.getItem(
        STORAGE_KEY
      ) === "true"
    );
  }

  function markUsed() {

    localStorage.setItem(
      STORAGE_KEY,
      "true"
    );
  }

  function restorePreviousSpin() {

    if (!alreadyUsed()) return;

    button.disabled = true;

    button.querySelector(
      ".mtw-button-top"
    ).textContent =
      "ALREADY SPUN";

    button.querySelector(
      ".mtw-button-bottom"
    ).textContent =
      "ONE SPIN PER CUSTOMER";

    status.textContent =
      "You have already spun the wheel.";
  }

  function spin() {

    if (
      spinning ||
      alreadyUsed()
    ) {
      return;
    }

    spinning = true;

    /*
     * Lock immediately.
     */

    markUsed();

    const stage =
      root.querySelector(
        ".mtw-wheel-stage"
      );

    stage.classList.add(
      "mtw-spinning"
    );

    button.disabled = true;

    button.querySelector(
      ".mtw-button-top"
    ).textContent =
      "GOOD LUCK!";

    button.querySelector(
      ".mtw-button-bottom"
    ).textContent =
      "THE WHEEL IS SPINNING...";

    status.textContent = "";

    const winnerIndex =
      Math.floor(
        Math.random() *
        rewards.length
      );

    const reward =
      rewards[winnerIndex];

    const winnerCentre =
      winnerIndex * slice +
      slice / 2;

    /*
     * Pointer is at 12 o'clock.
     */

    const targetAngle =
      360 - winnerCentre;

    const normalized =
      (
        currentRotation % 360 +
        360
      ) % 360;

    const adjustment =
      (
        targetAngle -
        normalized +
        360
      ) % 360;

    const extraSpins =
      360 *
      (
        5 +
        Math.floor(
          Math.random() * 3
        )
      );

    const finalRotation =
      currentRotation +
      extraSpins +
      adjustment;

    currentRotation =
      finalRotation;

    wheel.style.transform =
      `rotate(${finalRotation}deg)`;

    setTimeout(
      function () {

        spinning = false;

        stage.classList.remove(
          "mtw-spinning"
        );

        if (reward.code) {

          stage.classList.add(
            "mtw-winner"
          );

        }

        protectPrizeInTextarea(
          reward
        );

        if (reward.code) {

          status.textContent =
            `🎉 YOU WON: ${reward.label}`;

          status.classList.remove(
            "try-again"
          );

          status.classList.add(
            "win"
          );

          button.querySelector(
            ".mtw-button-top"
          ).textContent =
            "YOU WON!";

          button.querySelector(
            ".mtw-button-bottom"
          ).textContent =
            reward.label;

        } else {

          status.textContent =
            "TRY AGAIN — Better luck next time!";

          status.classList.remove(
            "win"
          );

          status.classList.add(
            "try-again"
          );

          button.querySelector(
            ".mtw-button-top"
          ).textContent =
            "ALREADY SPUN";

          button.querySelector(
            ".mtw-button-bottom"
          ).textContent =
            "ONE SPIN PER CUSTOMER";
        }

      },
      4150
    );
  }

  const wheel =
    document.getElementById(
      "mtw-wheel"
    );

  const button =
    document.getElementById(
      "mtw-spin-button"
    );

  const status =
    document.getElementById(
      "mtw-spin-status"
    );

  button.addEventListener(
    "click",
    spin
  );

  restorePreviousSpin();

})();
