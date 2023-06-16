// Camera setup function - returns a Promise so we have to call it in an async function
async function setupCamera() {
  // Find the video element on our HTML page
  video = document.getElementById("video");

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
