const cameras = {
  faceVerify: false,
  mediaRecorder: null,
  timerInterval: null,
  videoLive: null,
  videoRecorded: null,
  stream: null,
  _timer: null,
  model: null,
  canvas: null,
  ctx: null,
  isRecording: false,
  faceRunsInterval: null,
  init: async function () {
    cameras.videoLive = document.querySelector("#videoLive");
    cameras.videoRecorded = document.querySelector("#videoRecorded");
    cameras._timer = document.querySelector("#timer");
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
      // call detect faces every 100 milliseconds or 10 times every second
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

      // this.canvas.style = "display:none";
      // videoLive.srcObject = URL.createObjectURL(event.data);
      // stream.getTracks().forEach(function (track) {
      //   track.stop();
      // });
    });
  },
  drawResults: function (ctx, prediction, boundingBox, showKeypoints) {
    try {
      if (prediction.length > 1) {
        cameras.reset();
        this._timer.textContent =
          "không chấp nhận 2 khuôn mặt trong khung hình 00:05";
      } else if (prediction[0].landmarks.length == 6) {
        cameras.start();
      } else {
        cameras.reset();
        this._timer.textContent =
          "vui lòng giữ khuôn mặt trong khung hình 00:05";
      }
    } catch (error) {
      cameras.reset();
      this._timer.textContent = "vui lòng giữ khuôn mặt trong khung hình 00:05";
    }
    // cameras.canvas.width = cameras.videoLive.width;
    // cameras.canvas.height = cameras.videoLive.height;
    ctx.drawImage(cameras.videoLive, 0, 0, 600, 400);
    prediction.forEach((pred) => {
      // draw the rectangle enclosing the face
      if (boundingBox) {
        ctx.beginPath();
        ctx.lineWidth = "1";
        ctx.strokeStyle = "#FF2C35";
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
        ctx.fillStyle = "#32EEDB";

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

      display.textContent = minutes + ":" + seconds;

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
    // cameras.stream.getTracks().forEach(function (track) {
    //   track.stop();
    // });
    cameras.faceVerify = true;
  },
};

cameras.init();
