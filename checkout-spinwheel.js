(() => {
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

  const root = document.querySelector("#mtw-spin-wheel");

  if (!root || !rewards.length) return;

  root.innerHTML = `
    <style>
      #mtw-wheel-app {
        width: 100%;
        max-width: 520px;
        margin: 0 auto;
        text-align: center;
        font-family: inherit;
      }

      #mtw-wheel-wrap {
        position: relative;
        width: min(90vw, 460px);
        aspect-ratio: 1;
        margin: 0 auto 26px;
      }

      #mtw-wheel {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 9px solid #171717;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        transform: rotate(0deg);
        transition: transform 3.8s cubic-bezier(.12,.72,.15,1);
        cursor: pointer;
        box-shadow:
          0 12px 30px rgba(0,0,0,.18),
          0 3px 8px rgba(0,0,0,.12);
        background: #fff;
      }

      #mtw-wheel canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      #mtw-pointer {
        position: absolute;
        z-index: 5;
        top: -7px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 17px solid transparent;
        border-right: 17px solid transparent;
        border-top: 34px solid #65b746;
        filter: drop-shadow(0 3px 3px rgba(0,0,0,.25));
      }

      #mtw-pointer::after {
        content: "";
        position: absolute;
        left: -7px;
        top: -34px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,.25);
      }

      #mtw-spin-button {
        border: 0;
        background: #65b746;
        color: #fff;
        font: inherit;
        font-weight: 800;
        font-size: 17px;
        letter-spacing: .08em;
        padding: 15px 36px;
        border-radius: 999px;
        cursor: pointer;
        min-width: 170px;
        box-shadow: 0 7px 18px rgba(101,183,70,.25);
        transition:
          transform .15s ease,
          box-shadow .15s ease,
          opacity .15s ease;
      }

      #mtw-spin-button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 22px rgba(101,183,70,.3);
      }

      #mtw-spin-button:active:not(:disabled) {
        transform: translateY(1px);
      }

      #mtw-spin-button:disabled {
        opacity: .55;
        cursor: not-allowed;
        box-shadow: none;
      }

      #mtw-result {
        margin-top: 20px;
        min-height: 50px;
        padding: 0 10px;
        font-size: 25px;
        line-height: 1.2;
        font-weight: 850;
      }

      #mtw-result.win {
        color: #65b746;
      }

      #mtw-result.try-again {
        color: #555;
      }

      #mtw-result small {
        display: block;
        margin-top: 7px;
        font-size: 13px;
        font-weight: 600;
        color: #777;
      }

      .mtw-spin-hidden-input {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      @media (max-width: 480px) {
        #mtw-wheel-wrap {
          width: min(92vw, 400px);
        }

        #mtw-result {
          font-size: 22px;
        }
      }
    </style>

    <div id="mtw-wheel-app">

      <div id="mtw-wheel-wrap">
        <div id="mtw-pointer"></div>

        <div id="mtw-wheel">
          <canvas></canvas>
        </div>
      </div>

      <button id="mtw-spin-button" type="button">
        SPIN TO WIN
      </button>

      <div id="mtw-result" aria-live="polite"></div>

    </div>
  `;

  const wheel = root.querySelector("#mtw-wheel");
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const button = root.querySelector("#mtw-spin-button");
  const result = root.querySelector("#mtw-result");

  let currentRotation = 0;
  let spinning = false;
  let hasSpun = false;

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

  function getPrizeInput() {
    return document.querySelector(
      "textarea.input-block-level.form-control.mb-3"
    );
  }

  function setPrizeInput(reward) {
    if (!reward) return;

    const input = getPrizeInput();

    if (!input) {
      console.warn(
        "MTW Spin Wheel: Prize textarea not found."
      );
      return;
    }

    input.value = reward.value;

    input.classList.add(
      "mtw-spin-hidden-input"
    );

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

    console.log(
      "MTW Spin Prize:",
      input.value
    );
  }

  function sendPrizeToCheckout(reward) {
    let attempts = 0;

    const timer = setInterval(() => {
      attempts++;

      const input = getPrizeInput();

      if (input) {
        setPrizeInput(reward);
        clearInterval(timer);
      }

      if (attempts >= 30) {
        clearInterval(timer);

        console.warn(
          "MTW Spin Wheel: Could not find checkout prize textarea."
        );
      }
    }, 200);
  }

  function drawWheel() {
    const size = 1000;

    canvas.width = size;
    canvas.height = size;

    const centre = size / 2;
    const radius = size / 2;
    const slice =
      (Math.PI * 2) / rewards.length;

    ctx.clearRect(
      0,
      0,
      size,
      size
    );

    rewards.forEach((reward, i) => {
      const start =
        i * slice;

      const end =
        start + slice;

      ctx.beginPath();

      ctx.moveTo(
        centre,
        centre
      );

      ctx.arc(
        centre,
        centre,
        radius,
        start,
        end
      );

      ctx.closePath();

      ctx.fillStyle =
        colours[i];

      ctx.fill();

      ctx.strokeStyle =
        "#ffffff";

      ctx.lineWidth = 6;

      ctx.stroke();

      ctx.save();

      ctx.translate(
        centre,
        centre
      );

      ctx.rotate(
        start + slice / 2
      );

      ctx.textAlign =
        "right";

      ctx.textBaseline =
        "middle";

      const isLight =
        colours[i] === "#f4f4f4";

      ctx.fillStyle =
        isLight
          ? "#171717"
          : "#ffffff";

      ctx.font =
        "800 34px Arial";

      ctx.fillText(
        reward.label,
        radius - 38,
        0
      );

      ctx.restore();
    });

    ctx.beginPath();

    ctx.arc(
      centre,
      centre,
      72,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#ffffff";

    ctx.fill();

    ctx.strokeStyle =
      "#171717";

    ctx.lineWidth = 6;

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
      centre,
      centre,
      53,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#65b746";

    ctx.fill();

    ctx.fillStyle =
      "#ffffff";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      "900 23px Arial";

    ctx.fillText(
      "MTW",
      centre,
      centre
    );
  }

  function showResult(reward) {
    if (reward.value === "Try Again") {
      result.className =
        "try-again";

      result.innerHTML = `
        Better luck next time!
        <small>
          Thanks for playing.
        </small>
      `;

      return;
    }

    result.className =
      "win";

    result.innerHTML = `
      🎉 ${reward.value}
      <small>
        Your prize has been added to your checkout.
      </small>
    `;
  }

  function spin() {
    if (spinning || hasSpun) {
      return;
    }

    spinning = true;
    hasSpun = true;

    button.disabled = true;

    result.className = "";
    result.textContent = "";

    const winnerIndex =
      Math.floor(
        Math.random() *
        rewards.length
      );

    const slice =
      360 / rewards.length;

    const winnerCentre =
      winnerIndex * slice +
      slice / 2;

    const targetAngle =
      270 - winnerCentre;

    const normalized =
      (
        (currentRotation % 360) +
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

    setTimeout(() => {
      const reward =
        rewards[winnerIndex];

      sendPrizeToCheckout(
        reward
      );

      showResult(
        reward
      );

      spinning = false;

      button.disabled = true;

      button.textContent =
        "ALREADY SPUN";

      console.log(
        "MTW Spin Result:",
        reward
      );

    }, 3900);
  }

  wheel.addEventListener(
    "click",
    spin
  );

  button.addEventListener(
    "click",
    spin
  );

  drawWheel();

})();
