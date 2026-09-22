(() => {
  const rewards = [
    { label: "10% OFF", value: "10% OFF" },
    { label: "Free Freight", value: "Free Freight" },
    { label: "$20 Voucher", value: "$20 Voucher" },
    { label: "Try Again", value: "Try Again" },
    { label: "15% OFF", value: "15% OFF" },
    { label: "Free Gift", value: "Free Gift" },
    { label: "$50 Voucher", value: "$50 Voucher" },
    { label: "5% OFF", value: "5% OFF" }
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
        margin: 0 auto 25px;
      }

      #mtw-wheel {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 8px solid #111;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        transform: rotate(0deg);
        transition: transform 2s cubic-bezier(.12,.72,.15,1);
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(0,0,0,.2);
      }

      #mtw-wheel canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      #mtw-pointer {
        position: absolute;
        z-index: 5;
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 18px solid transparent;
        border-right: 18px solid transparent;
        border-top: 34px solid #111;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,.25));
      }

      #mtw-spin-button {
        border: 0;
        background: #111;
        color: #fff;
        font: inherit;
        font-weight: 700;
        font-size: 18px;
        padding: 14px 30px;
        border-radius: 8px;
        cursor: pointer;
        min-width: 150px;
      }

      #mtw-spin-button:hover {
        opacity: .85;
      }

      #mtw-spin-button:disabled {
        opacity: .5;
        cursor: not-allowed;
      }

      #mtw-result {
        margin-top: 18px;
        font-size: 24px;
        font-weight: 800;
        min-height: 32px;
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
        SPIN
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

  const colours = [
    "#111111",
    "#d71920",
    "#f5f5f5",
    "#777777",
    "#111111",
    "#d71920",
    "#f5f5f5",
    "#777777"
  ];

  function drawWheel() {
    const size = 1000;

    canvas.width = size;
    canvas.height = size;

    const centre = size / 2;
    const radius = size / 2;
    const slice = (Math.PI * 2) / rewards.length;

    ctx.clearRect(0, 0, size, size);

    rewards.forEach((reward, i) => {
      const start = i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(centre, centre);
      ctx.arc(
        centre,
        centre,
        radius,
        start,
        end
      );
      ctx.closePath();

      ctx.fillStyle = colours[i % colours.length];
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.save();

      ctx.translate(centre, centre);
      ctx.rotate(start + slice / 2);

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const isLight =
        colours[i % colours.length] === "#f5f5f5";

      ctx.fillStyle = isLight ? "#111111" : "#ffffff";
      ctx.font = "700 34px Arial";

      ctx.fillText(
        reward.label,
        radius - 35,
        0
      );

      ctx.restore();
    });

    // Centre
    ctx.beginPath();
    ctx.arc(
      centre,
      centre,
      65,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  function spin() {
    if (spinning) return;

    spinning = true;
    button.disabled = true;
    result.textContent = "";

    const winnerIndex =
      Math.floor(Math.random() * rewards.length);

    const slice = 360 / rewards.length;

    const winnerAngle =
      winnerIndex * slice + slice / 2;

    const targetAngle =
      360 - winnerAngle;

    const extraSpins =
      360 * (5 + Math.floor(Math.random() * 3));

    const finalRotation =
      currentRotation +
      extraSpins +
      targetAngle -
      (currentRotation % 360);

    currentRotation = finalRotation;

    wheel.style.transform =
      `rotate(${finalRotation}deg)`;

    setTimeout(() => {
      result.textContent =
        `🎉 ${rewards[winnerIndex].value}`;

      spinning = false;
      button.disabled = false;
    }, 2050);
  }

  wheel.addEventListener("click", spin);
  button.addEventListener("click", spin);

  drawWheel();
})();
