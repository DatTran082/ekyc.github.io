const countdownEl = document.querySelector(".countdown");
const progressBarEl = document.querySelector(".progress");

let remainingTime = 5; // seconds
const totalTime = remainingTime;

function countdown() {
  if (remainingTime > 0) {
    // update countdown timer
    countdownEl.textContent = remainingTime;

    // update progress bar
    const progress = ((totalTime - remainingTime) / totalTime) * 100;
    progressBarEl.style.width = `${progress}%`;

    remainingTime--;
    setTimeout(countdown, 1000);
  } else {
    // countdown finished
    progressBarEl.style.width = "100%";
    countdownEl.textContent = "Time's up!";
  }
}

var drawCircle = function (color, lineWidth, percent) {
  percent = Math.min(Math.max(0, percent || 1), 1);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2 * percent, false);
  ctx.strokeStyle = color;
  ctx.lineCap = "square"; // butt, round or square
  ctx.lineWidth = lineWidth;
  ctx.stroke();
};
