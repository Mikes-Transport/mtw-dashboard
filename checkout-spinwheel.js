console.log("MTW SPIN WHEEL TEST VERSION 6");

'use strict';

(function () {

  const rewards = [
    { label: "TRY AGAIN", value: "Try Again", code: null },
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

  let currentRotation = 0;
  let spinning = false;

  const root = document.getElementById("mtw-spin-wheel");

  if (!root) return;

  const slice = 360 / rewards.length;

  const gradientStops = rewards.map((_, i) => {

    const start = i * slice;
    const end = (i + 1) * slice;

    return `${colours[i]} ${start}deg ${end}deg`;

  }).join(", ");

  /*
   * Build the outer bulbs using calculated positions.
   */
  const lights = Array.from(
    { length: 32 },
    (_, i) => {

      const angle =
        i * (360 / 32) - 90;

      const radius = 47;

      const x =
        50 +
        Math.cos(
          angle * Math.PI / 180
        ) * radius;

      const y =
        50 +
        Math.sin(
          angle * Math.PI / 180
        ) * radius;

      return `
        <span
          style="
            left:${x}%;
            top:${y}%;
            --light:${i};
          "
        ></span>
      `;

    }
  ).join("");

  /*
   * Position each label from the exact
   * centre angle of its pizza slice.
   */
  const labels = rewards.map(
    (reward, i) => {

      const centre =
        i * slice +
        slice / 2;

      return `
        <div
          class="mtw-label"
          style="--angle:${centre}deg;"
        >
          <span>${reward.label}</span>
        </div>
      `;

    }
  ).join("");

  root.innerHTML = `
    <div class="mtw-spin-wrap">

      <div class="mtw-wheel-stage">

        <div class="mtw-wheel-shadow"></div>

        <div class="mtw-light-ring">
          ${lights}
        </div>

        <div class="mtw-pointer">
          <div class="mtw-pointer-glow"></div>
        </div>

        <div
          class="mtw-wheel"
          id="mtw-wheel"
          style="
            --wheel-gradient:
              conic-gradient(
                from 0deg,
                ${gradientStops}
              );
          "
        >

          <div class="mtw-labels">
            ${labels}
          </div>

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
        <span class="mtw-button-top">
          SPIN THE WHEEL
        </span>

        <span class="mtw-button-bottom">
          WIN SOMETHING!
        </span>
      </button>

      <div
        class="mtw-spin-status"
        id="mtw-spin-status"
      ></div>

    </div>
  `;

  const style =
    document.createElement("style");

  style.textContent = `

    #mtw-spin-wheel {
      width: 100%;
      // max-width: 443.516px;
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

    /* =========================================
       WHEEL STAGE
    ========================================= */

    .mtw-wheel-stage {
      position: relative;

      width: min(88vw, 443.516px);
      height: min(88vw, 443.516px);

      margin: 0 auto 35px;

      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mtw-wheel-shadow {
      position: absolute;

      width: 82%;
      height: 82%;

      border-radius: 50%;

      background: rgba(0,0,0,.5);

      filter: blur(18px);

      transform: translateY(18px);

      z-index: 0;
    }

    /* =========================================
       OUTER LIGHTS
    ========================================= */

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
        0 0 24px rgba(255,166,0,.9);

      transform:
        translate(-50%, -50%)
        scale(.85);

      animation:
        mtwBulbIdle
        1.1s
        infinite
        alternate;

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
        mtwBulbSpin
        .16s
        infinite
        alternate;
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
          0 0 32px rgba(255,128,0,.95);
      }

    }

    /* =========================================
       WHEEL
    ========================================= */

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
        transform
        4.1s
        cubic-bezier(.08,.78,.12,1);

      will-change: transform;
    }

    /* =========================================
       FAKE GLOSS / SHINE
    ========================================= */

    .mtw-wheel::after {
      content: "";

      position: absolute;

      inset: 0;

      border-radius: 50%;

      background:
        linear-gradient(
          125deg,
          rgba(255,255,255,.26) 0%,
          rgba(255,255,255,.10) 18%,
          rgba(255,255,255,0) 42%
        );

      pointer-events: none;

      z-index: 8;
    }

    /* =========================================
       LABELS
    ========================================= */

    .mtw-labels {
      position: absolute;

      inset: 0;

      z-index: 6;

      pointer-events: none;
    }

    .mtw-label {

      position: absolute;

      left: 50%;
      top: 50%;

      width: 100%;
      height: 100%;

      transform:
        translate(-50%, -50%)
        rotate(var(--angle));

      transform-origin:
        center center;

      pointer-events: none;
    }

    .mtw-label span {

      position: absolute;

      left: 50%;

      top: 15%;

      width: 42%;

      transform:
        translateX(-50%)
        rotate(90deg);

      text-align: center;

      font-size:
        clamp(13px, 2.9vw, 14px);

      font-weight: 1000;

      line-height: 1.05;

      letter-spacing: .25px;

      color: #ffffff;

      text-shadow:
        0 2px 4px rgba(0,0,0,.95),
        0 0 4px rgba(0,0,0,.75);

      white-space: normal;
    }

    /* ALL LABELS STAY WHITE */

    .mtw-label:nth-child(3) span,
    .mtw-label:nth-child(6) span {

      color: #ffffff;

      text-shadow:
        0 2px 4px rgba(0,0,0,.95),
        0 0 4px rgba(0,0,0,.75);
    }

    /* =========================================
       CENTRE HUB
    ========================================= */

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

      border: 7px solid #171717;

      display: flex;

      align-items: center;
      justify-content: center;

      box-shadow:
        0 4px 8px rgba(0,0,0,.45),
        0 0 20px rgba(101,183,70,.5),
        inset 0 2px 4px rgba(255,255,255,.35);
    }

    .mtw-wheel-stage.mtw-spinning
    .mtw-wheel-centre {

      animation:
        mtwCentrePulse
        .45s
        infinite
        alternate;
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
        2px solid
        rgba(255,255,255,.3);
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

    /* =========================================
       POINTER
    ========================================= */

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
          0 4px 3px
          rgba(0,0,0,.35)
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

    /* =========================================
       SPIN BUTTON
    ========================================= */

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
        0 0 18px rgba(101,183,70,.35);

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
        0 0 25px rgba(101,183,70,.55);

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

    /* =========================================
       RESULT
    ========================================= */

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
        mtwWinReveal
        .6s
        ease both;
    }

    .mtw-spin-status.try-again {

      color: #171717;

      animation:
        mtwResultReveal
        .5s
        ease both;
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

    /* =========================================
       WINNER LIGHTS
    ========================================= */

    .mtw-wheel-stage.mtw-winner
    .mtw-light-ring span {

      animation:
        mtwWinnerLights
        .22s
        infinite
        alternate;
    }

    .mtw-wheel-stage.mtw-winner
    .mtw-wheel {

      box-shadow:
        0 0 0 4px rgba(255,255,255,.15),
        0 0 0 9px rgba(101,183,70,.75),
        0 0 35px rgba(101,183,70,.75),
        0 0 70px rgba(101,183,70,.35),
        inset 0 0 30px rgba(0,0,0,.65);
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

    #block_30 {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      box-sizing: border-box !important;
    }
    
    #block_30 #mtw-spin-wheel {
      width: 100% !important;
      max-width: 680px !important;
      margin: 0 auto !important;
    }
    
    #block_30 .mtw-spin-wrap {
      width: 100% !important;
      max-width: 100% !important;
    }
    
    #block_30 .mtw-wheel-stage {
      width: min(88vw, 560px) !important;
      max-width: 100% !important;
      height: auto !important;
      aspect-ratio: 1 / 1 !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    /* =========================================
       MOBILE
    ========================================= */

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

      .mtw-label span {

        top: 15%;

        width: 42%;

        font-size:
          clamp(13px, 2.9vw, 18px);

        color: #ffffff;
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

  /* =========================================
     CHECKOUT COMMENTS PRIZE HANDLING
  ========================================= */

  let prizePrefix = "";

  function getPrizeInput() {

    return document.querySelector(
      "textarea.input-block-level.form-control.mb-3"
    );

  }

  function protectPrizeInTextarea(reward) {

    const input =
      getPrizeInput();

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

  /* =========================================
     LOCAL STORAGE DISABLED FOR TESTING
  ========================================= */

  function alreadyUsed() {
    return false;
  }

  function markUsed() {
    // Disabled during testing.
  }

  function restorePreviousSpin() {
    // Disabled during testing.
  }

  /* =========================================
     SPIN
  ========================================= */

  function spin() {

    if (spinning) return;

    spinning = true;

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

    status.classList.remove(
      "win",
      "try-again"
    );

    stage.classList.remove(
      "mtw-winner"
    );

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
            "SPIN AGAIN";

          button.querySelector(
            ".mtw-button-bottom"
          ).textContent =
            "TEST MODE";

          button.disabled = false;

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
