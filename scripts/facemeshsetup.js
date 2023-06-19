// Camera setup function - returns a Promise so we have to call it in an async function
const canvas = document.getElementById("facecanvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");

async function setupCamera() {
  // Find the video element on our HTML page

  // Request the front-facing camera of the device
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      height: { ideal: 1920 },
      width: { ideal: 1920 },
    },
  });

  video.srcObject = stream;

  // Handle the video stream once it loads.
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

function drawWebcamContinuous() {
  ctx.drawImage(video, 0, 0);
  requestAnimationFrame(drawWebcamContinuous);
}

async function main() {
  // Set up front-facing camera
  await setupCamera();
  video.play();

  // Set up canvas for livestreaming

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Start continuous drawing function
  drawWebcamContinuous();

  console.log("Camera setup done");
}

// Delay the camera request by a bit, until the main body has loaded
document.addEventListener("DOMContentLoaded", main);
// facemeshsetup1.js;
// Camera setup function - returns a Promise so we have to call it in an async function
async function setupCamera() {
  // Find the video element on our HTML page

  // Request the front-facing camera of the device
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      //   height: { ideal: 1920 },
      //   width: { ideal: 1920 },
    },
  });
  video.srcObject = stream;

  // Handle the video stream once it loads.
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function main() {
  // Set up front-facing camera
  await setupCamera();
  video.play();

  // Set up canvas for livestreaming
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  console.log("Camera setup done");
  if (
    location.hostname === "localhost" ||
    location.hostname === "http://10.0.10.156/" ||
    location.protocol === "https:"
  ) {
    alert("Run WebRTC code");
  } else {
    alert("Redirect user from http to https");
  }
}

main();
