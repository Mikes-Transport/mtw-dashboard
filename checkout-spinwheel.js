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
    "#171717",
    "#65b746",
    "#f4f4f4",
    "#2f2f2f",
    "#65b746",
    "#f4f4f4",
    "#171717",
    "#65b746"
  ];

  const STORAGE_KEY = "mtw_spin_wheel_used";

  let currentRotation = 0;
  let spinning = false;
  let winningReward = null;
  let prizePrefix = "";
  let prizeInput = null;

  const root = document.getElementById("mtw-spin-wheel");

  if (!root) return;

  root.innerHTML = `
    <div class="mtw-spin-wrap">

      <div class="mtw-wheel-area">

        <div class="mtw-pointer"></div>

        <div class="mtw-wheel" id="mtw-wheel">
          ${rewards.map((reward, i) => `
            <div
              class="mtw-wheel-label"
              style="--i:${i}; --slice:${360 / rewards.length}deg;"
            >
              <span>${reward.label}</span>
            </div>
          `).join("")}
        </div>

        <div class="mtw-wheel-centre">
          <span>SPIN</span>
        </div>

      </div>

      <button type="button" class="mtw-spin-button" id="mtw-spin-button">
        SPIN THE WHEEL
      </button>

      <div class="mtw-spin-status" id="mtw-spin-status"></div>

    </div>
  `;

  const wheel = document.getElementById("mtw-wheel");
  const button = document.getElementById("mtw-spin-button");
  const status = document.getElementById("mtw-spin-status");

  const style = document.createElement("style");

  style.textContent = `
    #mtw-spin-wheel {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      font-family: inherit;
    }

    .mtw-spin-wrap {
      width: 100%;
      text-align: center;
    }

    .mtw-wheel-area {
      position: relative;
      width: min(90vw, 520px);
      height: min(90vw, 520px);
      margin: 0 auto 30px;
    }

    .mtw-wheel {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      overflow: hidden;
      border: 8px solid #171717;
      box-shadow:
        0 12px 30px rgba(0,0,0,.18),
        inset 0 0 0 3px rgba(255,255,255,.15);
      transform: rotate(0deg);
      transition: transform 3.9s cubic-bezier(.12,.78,.15,1);
      background:
        conic-gradient(
          ${colours.map((colour, i) =>
            `${colour} ${i * (360 / rewards.length)}deg ${(i + 1) * (360 / rewards.length)}deg`
          ).join(",")}
        );
    }

    .mtw-wheel-label {
      position: absolute;
      inset: 0;
      transform: rotate(
        calc(var(--i) * var(--slice) + var(--slice) / 2)
      );
      pointer-events: none;
    }

    .mtw-wheel-label span {
      position: absolute;
      top: 11%;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      font-size: clamp(11px, 2.5vw, 15px);
      font-weight: 800;
      line-height: 1.15;
      text-align: center;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,.8);
    }

    .mtw-wheel-label:nth-child(3) span,
    .mtw-wheel-label:nth-child(6) span {
      color: #171717;
      text-shadow: none;
    }

    .mtw-wheel-centre {
      position: absolute;
      z-index: 5;
      top: 50%;
      left: 50%;
      width: 105px;
      height: 105px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: #65b746;
      border: 7px solid #171717;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 5px 15px rgba(0,0,0,.3);
    }

    .mtw-wheel-centre span {
      font-size: 18px;
      font-weight: 900;
      color: #fff;
      letter-spacing: .5px;
    }

    .mtw-pointer {
      position: absolute;
      z-index: 10;
      top: -7px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 18px solid transparent;
      border-right: 18px solid transparent;
      border-top: 35px solid #171717;
      filter: drop-shadow(0 3px 3px rgba(0,0,0,.3));
    }

    .mtw-spin-button {
      appearance: none;
      border: 0;
      border-radius: 10px;
      padding: 15px 32px;
      background: #65b746;
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      transition: .2s ease;
      box-shadow: 0 5px 15px rgba(0,0,0,.15);
    }

    .mtw-spin-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,.2);
    }

    .mtw-spin-button:disabled {
      opacity: .55;
      cursor: not-allowed;
      transform: none;
    }

    .mtw-spin-status {
      min-height: 28px;
      margin-top: 18px;
      font-size: 18px;
      font-weight: 800;
    }

    .mtw-spin-status.win {
      color: #65b746;
    }

    .mtw-spin-status.try-again {
      color: #171717;
    }
  `;

  document.head.appendChild(style);

  function getPrizeInput() {
    return document.querySelector(
      "textarea.input-block-level.form-control.mb-3"
    );
  }

  /*
   * Puts the prize into the existing checkout comments textarea.
   * Only the prize prefix is protected.
   * Everything after the prefix remains editable.
   */
  function protectPrizeInTextarea(reward) {

    const input = getPrizeInput();

    if (!input || !reward) return;

    prizeInput = input;

    prizePrefix = `MTW SPIN WHEEL PRIZE: ${reward.value}\n\n`;

    let existingComments = input.value || "";

    if (existingComments.startsWith("MTW SPIN WHEEL PRIZE:")) {
      existingComments = existingComments.replace(
        /^MTW SPIN WHEEL PRIZE:[^\n]*(?:\n\n)?/,
        ""
      );
    }

    input.value = prizePrefix + existingComments;

    input.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    input.dispatchEvent(
      new Event("change", { bubbles: true })
    );

    /*
     * Prevent keyboard editing of the locked prize section.
     */
    input.addEventListener("keydown", function (event) {

      const start = input.selectionStart;
      const end = input.selectionEnd;

      const selectionTouchesPrize =
        start < prizePrefix.length ||
        end < prizePrefix.length;

      if (!selectionTouchesPrize) return;

      /*
       * Allow normal navigation, but don't allow the
       * protected prize text to be deleted or changed.
       */
      const blockedKeys = [
        "Backspace",
        "Delete"
      ];

      if (blockedKeys.includes(event.key)) {
        event.preventDefault();

        input.setSelectionRange(
          prizePrefix.length,
          prizePrefix.length
        );
      }
    });

    /*
     * Prevent typing/pasting over the prize.
     */
    input.addEventListener("beforeinput", function (event) {

      const start = input.selectionStart;
      const end = input.selectionEnd;

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
    });

    /*
     * If anything somehow manages to alter the beginning
     * of the textarea, restore the prize while keeping
     * the customer's comments.
     */
    input.addEventListener("input", function () {

      if (!input.value.startsWith(prizePrefix)) {

        let value = input.value;

        if (value.startsWith("MTW SPIN WHEEL PRIZE:")) {
          value = value.replace(
            /^MTW SPIN WHEEL PRIZE:[^\n]*(?:\n\n)?/,
            ""
          );
        }

        input.value = prizePrefix + value;
      }
    });

    /*
     * Stop the customer selecting the prize and replacing
     * it with pasted text.
     */
    input.addEventListener("paste", function () {

      setTimeout(function () {

        if (!input.value.startsWith(prizePrefix)) {

          let value = input.value;

          value = value.replace(
            /^MTW SPIN WHEEL PRIZE:[^\n]*(?:\n\n)?/,
            ""
          );

          input.value = prizePrefix + value;
        }

      }, 0);

    });

    /*
     * Keep the prize as the first part of the textarea.
     */
    input.addEventListener("cut", function (event) {

      const start = input.selectionStart;
      const end = input.selectionEnd;

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

    });
  }

  function restorePrizeIfNeeded() {

    if (!prizeInput || !prizePrefix) return;

    if (!prizeInput.value.startsWith(prizePrefix)) {

      let comments = prizeInput.value || "";

      comments = comments.replace(
        /^MTW SPIN WHEEL PRIZE:[^\n]*(?:\n\n)?/,
        ""
      );

      prizeInput.value = prizePrefix + comments;

      prizeInput.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }
  }

  function alreadyUsed() {
    return localStorage.getItem(STORAGE_KEY) === "true";
  }

  function markUsed() {
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function restorePreviousSpin() {

    if (!alreadyUsed()) return;

    button.disabled = true;
    button.textContent = "ALREADY SPUN";

    status.textContent = "You have already spun the wheel.";
  }

  function spin() {

    if (spinning || alreadyUsed()) return;

    spinning = true;

    /*
     * IMPORTANT:
     * Mark the spin as used immediately.
     * This means refreshing during the animation won't
     * give the customer another spin.
     */
    markUsed();

    button.disabled = true;
    button.textContent = "SPINNING...";

    status.textContent = "";

    const winnerIndex =
      Math.floor(Math.random() * rewards.length);

    const reward = rewards[winnerIndex];

    winningReward = reward;

    const slice = 360 / rewards.length;

    /*
     * Pointer is at 12 o'clock = 270 degrees.
     * Aim the centre of the winning slice at the pointer.
     */
    const winnerCentre =
      winnerIndex * slice + slice / 2;

    const targetAngle =
      270 - winnerCentre;

    const normalized =
      ((currentRotation % 360) + 360) % 360;

    const adjustment =
      (targetAngle - normalized + 360) % 360;

    const extraSpins =
      360 * (5 + Math.floor(Math.random() * 3));

    const finalRotation =
      currentRotation +
      extraSpins +
      adjustment;

    currentRotation = finalRotation;

    wheel.style.transform =
      `rotate(${finalRotation}deg)`;

    setTimeout(function () {

      spinning = false;

      protectPrizeInTextarea(reward);

      if (reward.code) {

        status.textContent =
          `🎉 YOU WON: ${reward.label}`;

        status.classList.add("win");

      } else {

        status.textContent =
          "TRY AGAIN — Better luck next time!";

        status.classList.add("try-again");
      }

      button.textContent = "ALREADY SPUN";

    }, 3900);
  }

  button.addEventListener("click", spin);

  restorePreviousSpin();

})();
