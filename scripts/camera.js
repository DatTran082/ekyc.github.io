const NUM_KEYPOINTS = 6;
const GREEN = "#32EEDB";
const RED = "#FF2C35";
const BLUE = "#157AB3";

const cameras = {
  faceVerify: false,
  mediaRecorder: null,
  timerInterval: null,
  videoLive: null,
  videoRecorded: null,
  stream: null,
  _timer: null,
  _message: null,
  model: null,
  canvas: null,
  ctx: null,
  isRecording: false,
  faceRunsInterval: null,
  init: async function () {
    cameras.videoLive = document.querySelector("#videoLive");
    cameras.videoRecorded = document.querySelector("#videoRecorded");
    cameras._timer = document.querySelector("#timer");
    cameras._message = document.querySelector("#message");
    cameras.canvas = document.getElementById("canvas");
    cameras.ctx = cameras.canvas.getContext("2d");

    cameras.model = model = await blazeface.load();
    cameras.stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    cameras.videoLive.srcObject = cameras.stream;

    if (!MediaRecorder.isTypeSupported("video/webm")) {
      console.warn("video/webm is not supported");
    }

    cameras.mediaRecorder = new MediaRecorder(cameras.stream, {
      mimeType: "video/webm",
    });

    cameras.handleEvent();
  },
  handleEvent: function () {
    this.videoLive.addEventListener("loadeddata", async () => {
      console.log("state camera: ", cameras.mediaRecorder.state);
      cameras.faceRunsInterval = setInterval(cameras.detectFaces, 100);
    });

    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (cameras.faceVerify == true) {
        cameras.videoRecorded.src = URL.createObjectURL(event.data); // <6>
        cameras.videoLive.style = "display:none";
        cameras.canvas.style = "display:none";
        cameras.videoRecorded.style = "display:block";
      }
    });
  },
  drawResults: function (ctx, prediction, boundingBox, showKeypoints) {
    // console.log(prediction);
    try {
      if (prediction.length > 1) {
        cameras.reset();
        this._timer.textContent = "recording: -_-";
        this._message.textContent = "chỉ cho phép 1 khuôn mặt trong khung hình";
      } else if (prediction[0].landmarks.length == 6) {
        const faceMattrix = prediction[0].landmarks;
        const probability = prediction[0].probability[0];
        const WIDTH = prediction[0].bottomRight[0] - prediction[0].topLeft[0];
        const HEIGHT = prediction[0].bottomRight[1] - prediction[0].topLeft[1];

        // if (WIDTH <= 280 || HEIGHT <= 220) {
        //   this._message.textContent =
        //     "Giữ cho khuôn mặt cách màn hình khoảng 30cm";
        // } else

        if (
          prediction[0].topLeft[0] < 30 ||
          prediction[0].topLeft[0] > 290 ||
          prediction[0].topLeft[1] < 0 ||
          prediction[0].topLeft[1] > 250
        ) {
          this._timer.textContent = "recording: -_-";
          this._message.textContent = "Giữ cho khuôn mặt ở chính giữa màn hình";
          cameras.reset();
        } else if (probability < 0.995) {
          this._timer.textContent = "recording: -_-";
          this._message.textContent = "vui lòng giữ khuôn mặt không bị che";
          cameras.reset();
        } else {
          this._message.textContent = "";

          cameras.start();
        }

        console.table([
          [
            "left eye",
            `X: ${Math.round(faceMattrix[0][0])} | Y: ${Math.round(
              faceMattrix[0][1]
            )}`,
          ],
          [
            "right eye",
            `X: ${Math.round(faceMattrix[1][0])} | Y: ${Math.round(
              faceMattrix[1][1]
            )}`,
          ],
          [
            "nose",
            `X: ${Math.round(faceMattrix[2][0])} | Y: ${Math.round(
              faceMattrix[2][1]
            )}`,
          ],
          [
            "left ear",
            `X: ${Math.round(faceMattrix[3][0])} | Y: ${Math.round(
              faceMattrix[3][1]
            )}`,
          ],
          [
            "right ear",
            `X: ${Math.round(faceMattrix[4][0])} | Y: ${Math.round(
              faceMattrix[4][1]
            )}`,
          ],
          [
            "mouth",
            `X: ${Math.round(faceMattrix[5][0])} | Y: ${Math.round(
              faceMattrix[5][1]
            )}`,
          ],
          ["X", prediction[0].topLeft[0]],
          ["Y", prediction[0].topLeft[1]],
          ["WIDTH", WIDTH],
          ["HEIGHT", HEIGHT],
          ["PROBABILITY", probability],
        ]);
      }
    } catch (error) {
      cameras.reset();
      this._timer.textContent = "recording: -_-";
      this._message.textContent = "không tìm thấy khuôn mặt trong khung hình";
    }
    // cameras.canvas.width = cameras.videoLive.width;
    // cameras.canvas.height = cameras.videoLive.height;
    // ctx.scale(-1, 1);

    ctx.drawImage(cameras.videoLive, 0, 0, 650, 480);
    prediction.forEach((pred) => {
      // draw the rectangle enclosing the face
      if (boundingBox) {
        ctx.beginPath();
        ctx.lineWidth = "1";
        ctx.strokeStyle = RED;

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
        ctx.fillStyle = GREEN;

        pred.landmarks.forEach((landmark) => {
          ctx.fillRect(landmark[0], landmark[1], 5, 5);
        });
      }
    });
  },
  detectFaces: async function () {
    const estimationConfig = { flipHorizontal: true };
    const prediction = await cameras.model.estimateFaces(this.videoLive, false);

    // console.log(prediction);

    cameras.drawResults(cameras.ctx, prediction, true, true);
  },
  startTimer: function (duration, display) {
    let timer = duration;
    let minutes;
    let seconds;

    cameras.timerInterval = setInterval(function () {
      minutes = parseInt(timer / 60, 10);
      seconds = parseInt(timer % 60, 10);

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      display.textContent = "recording: " + seconds;

      if (--timer < 0) {
        timer = 0;
        cameras.stop();
      }
    }, 1000);
  },
  start: function () {
    this.videoRecorded.style = "display:none";
    this.videoLive.style = "display:block";
    this.faceVerify = false;
    if (cameras.isRecording === false) {
      this.mediaRecorder.start();
      cameras.isRecording = true;
      var time = 5;
      this.startTimer(time, this._timer);
    }
  },
  reset: function () {
    this.videoRecorded.style = "display:none";
    this.videoLive.style = "display:block";
    this.faceVerify = false;

    cameras.mediaRecorder.stop();
    cameras.isRecording = false;
    clearInterval(cameras.timerInterval);
  },
  stop: function () {
    cameras.mediaRecorder.stop();
    cameras.isRecording = false;

    clearInterval(cameras.timerInterval);
    clearInterval(cameras.faceRunsInterval);
    cameras.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    cameras.faceVerify = true;
  },
};

cameras.init();

const tempt = [
  {
    topLeft: [184.4397735595703, 122.96421813964844],
    bottomRight: [456.9659423828125, 327.3579406738281],
    landmarks: [
      [270.2274280786514, 176.69438481330872],
      [372.32213020324707, 182.99121916294098],
      [317.38202810287476, 232.47283816337585],
      [312.9612874984741, 272.9273557662964],
      [219.18052673339844, 189.79238390922546],
      [423.1648349761963, 203.6924010515213],
    ],
    probability: [0.99959796667099],
  },
];
