function drawWebcamContinuous() {
  ctx.drawImage(video, 0, 0);
  requestAnimationFrame(drawWebcamContinuous);
}
