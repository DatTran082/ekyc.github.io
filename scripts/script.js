let video = document.getElementById("videoLive");
let model;
// declare a canvas variable and get its context
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

const setupCamera = () => {
  navigator.mediaDevices
    .getUserMedia({
      video: { width: 600, height: 400 },
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    });
};

const detectFaces = async () => {
  // const estimationConfig = { flipHorizontal: true }
  const prediction = await model.estimateFaces(video, false);

  // console.log(prediction);

  drawResults(ctx, prediction, true, true);
};

const drawResults = (
  ctx,
  prediction,
  boundingBox = true,
  showKeypoints = true
) => {
  ctx.drawImage(video, 0, 0, 600, 400);
  prediction.forEach((pred) => {
    // draw the rectangle enclosing the face

    if (boundingBox) {
      ctx.beginPath();
      ctx.lineWidth = "1";
      ctx.strokeStyle = "GREEN";
      // the last two arguments are width and height
      // since blazeface returned only the coordinates,
      // we can find the width and height by subtracting them.
      ctx.rect(
        pred.topLeft[0],
        pred.topLeft[1],
        pred.bottomRight[0] - pred.topLeft[0],
        pred.bottomRight[1] - pred.topLeft[1]
      );
      ctx.stroke();
    }

    if (showKeypoints) {
      // drawing small rectangles for the face landmarks
      ctx.fillStyle = "WHITE";
      pred.landmarks.forEach((landmark) => {
        ctx.fillRect(landmark[0], landmark[1], 5, 5);
      });
    }
  });
};

setupCamera();
video.addEventListener("loadeddata", async () => {
  model = await blazeface.load();
  // call detect faces every 100 milliseconds or 10 times every second
  setInterval(detectFaces, 10);
});
