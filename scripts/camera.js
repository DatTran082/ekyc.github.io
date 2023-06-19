const cameras = {
  GREEN: "#32EEDB",
  RED: "#FF2C35",
  BLUE: "#157AB3",
  label: [
    "rightEye",
    "leftEye",
    "noseTip",
    "mouthCenter",
    "rightEarTragion",
    "leftEarTragion",
  ],
  loader: null,
  confirm: null,
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
    cameras.loader = document.querySelector("#loader");
    cameras.confirm = document.querySelector("#confirm");
    cameras.videoRecorded = document.querySelector("#videoRecorded");
    cameras._timer = document.querySelector("#timer");
    cameras._message = document.querySelector("#message");
    cameras.canvas = document.getElementById("canvas");
    cameras.ctx = cameras.canvas.getContext("2d");

    try {
      cameras.model = await blazeface.load();

      // cameras.model = await tf.loadGraphModel(
      //   "https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface"
      // );

      console.log("model loaded: ", cameras.model);
    } catch (error) {
      console.log("init faceDetection failure: ", error);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });

      cameras.videoLive.srcObject = stream;
      cameras.stream = stream;

      cameras.videoLive.addEventListener("loadeddata", async () => {
        // if (cameras.faceRunsInterval) {
        //   clearInterval(cameras.faceRunsInterval);
        // }
        cameras.faceRunsInterval = setInterval(cameras.detectFaces, 50);
      });

      cameras.handleEvent();
    } catch (error) {
      console.log("init camera stream failure: ", error);
    }
  },
  handleEvent: async function () {
    try {
      if (!MediaRecorder.isTypeSupported("video/webm")) {
        console.warn("video/webm is not supported");
        this._message.textContent = "MediaRecorder is not supported";
      }

      cameras.mediaRecorder = new MediaRecorder(cameras.stream, {
        mimeType: "video/webm",
      });

      cameras.mediaRecorder.addEventListener("dataavailable", (event) => {
        if (cameras.faceVerify == true) {
          cameras.videoRecorded.src = URL.createObjectURL(event.data); // <6>
          cameras.videoLive.style = "display:none";
          cameras.canvas.style = "display:none";
          cameras.loader.style = "display:none";
          cameras.videoRecorded.style = "display:block";
          cameras.confirm.style = "display:block";
        }
      });
    } catch (error) {
      this._message.textContent = "MediaRecorder is not supported";
      console.log(error);
    }
  },
  drawResults: function (ctx, prediction, boundingBox, showKeypoints) {
    // console.log(prediction);
    try {
      if (prediction.length > 1) {
        cameras.reset();
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
          prediction[0].topLeft[0] < 30 || //x->
          prediction[0].topLeft[0] > 290 || //x<-
          prediction[0].topLeft[1] < 0 || //y->
          prediction[0].topLeft[1] > 250 //y-<
        ) {
          this._message.textContent = "Giữ cho khuôn mặt ở chính giữa màn hình";
          cameras.reset();
        } else if (probability < 0.995) {
          //check percentage output
          this._message.textContent =
            "vui lòng giữ khuôn mặt cách màn hình khoảng 30cm và không bị che";
          cameras.reset();
        } else {
          this._message.textContent = "";
          cameras.start();
        }

        //#region detect loger
        // console.table([
        //   [
        //     cameras.label[0],
        //     `X:${Math.round(faceMattrix[0][0])} | Y:${Math.round(
        //       faceMattrix[0][1]
        //     )}`,
        //   ],
        //   [
        //     cameras.label[1],
        //     `X:${Math.round(faceMattrix[1][0])} | Y:${Math.round(
        //       faceMattrix[1][1]
        //     )}`,
        //   ],
        //   [
        //     cameras.label[2],
        //     `X:${Math.round(faceMattrix[2][0])} | Y:${Math.round(
        //       faceMattrix[2][1]
        //     )}`,
        //   ],
        //   [
        //     cameras.label[3],
        //     `X:${Math.round(faceMattrix[3][0])} | Y:${Math.round(
        //       faceMattrix[3][1]
        //     )}`,
        //   ],
        //   [
        //     cameras.label[4],
        //     `X:${Math.round(faceMattrix[4][0])} | Y:${Math.round(
        //       faceMattrix[4][1]
        //     )}`,
        //   ],
        //   [
        //     cameras.label[5],
        //     `X:${Math.round(faceMattrix[5][0])} | Y:${Math.round(
        //       faceMattrix[5][1]
        //     )}`,
        //   ],
        //   ["X", prediction[0].topLeft[0]],
        //   ["Y", prediction[0].topLeft[1]],
        //   ["WIDTH", WIDTH],
        //   ["HEIGHT", HEIGHT],
        //   ["PROBABILITY", probability],
        // ]);
        //#endregion
      }
    } catch (error) {
      cameras.reset();
      this._message.textContent = "không tìm thấy khuôn mặt trong khung hình";
    }

    ctx.drawImage(cameras.videoLive, 0, 0, 650, 480);
    prediction.forEach((pred) => {
      // draw the rectangle enclosing the face
      ctx.strokeStyle = cameras.GREEN;
      if (boundingBox) {
        ctx.beginPath();
        ctx.lineWidth = "1";

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
        ctx.fillStyle = cameras.RED;
        // ctx.fillStyle = RED;
        //detect 6 point of face
        pred.landmarks.forEach((landmark) => {
          ctx.fillRect(landmark[0], landmark[1], 4, 4);
        });

        // const eye = {
        //   left: {
        //     x: pred.landmarks[1][0],
        //     y: pred.landmarks[1][1],
        //   },
        //   right: {
        //     x: pred.landmarks[0][0],
        //     y: pred.landmarks[0][1],
        //   },
        // };
        // const nose = {
        //   x: pred.landmarks[2][0],
        //   y: pred.landmarks[2][1],
        // };
        // const mouth = {
        //   x: pred.landmarks[3][0],
        //   y: pred.landmarks[3][1],
        // };
        // const ear = {
        //   left: {
        //     x: pred.landmarks[5][0],
        //     y: pred.landmarks[5][1],
        //   },
        //   right: {
        //     x: pred.landmarks[4][0],
        //     y: pred.landmarks[4][1],
        //   },
        // };
        // // draw a red line
        // // ctx.strokeStyle = GREEN;
        // // ctx.lineWidth = 5;

        // //#region parabol tu tai trai -20 -> midpoint -> tai phai
        // const ear_extendlength = 20;
        // ctx.moveTo(ear.left.x + ear_extendlength, ear.left.y);
        // ctx.quadraticCurveTo(
        //   nose.x,
        //   nose.y - 60,
        //   ear.right.x - ear_extendlength,
        //   ear.right.y
        // );
        // //#endregion

        // //tinh toa do trung diem cua 2 point
        // function midpoint([x1, y1], [x2, y2]) {
        //   return {
        //     x: (x1 + x2) / 2,
        //     y: (y1 + y2) / 2,
        //   };
        // }
        // //#region parabol tu mom -> mui -> midpoint -40
        // const midpoint_etendlength = 90;
        // const midpoint_eye = midpoint(
        //   [eye.left.x, eye.left.y],
        //   [eye.right.x, eye.right.y]
        // );
        // ctx.moveTo(midpoint_eye.x, midpoint_eye.y - midpoint_etendlength);
        // ctx.quadraticCurveTo(nose.x, nose.y, mouth.x, mouth.y + 60);
        // //#endregion
        // ctx.stroke();
      }
    });
  },
  detectFaces: async function () {
    if (cameras.model) {
      const estimationConfig = { flipHorizontal: true };
      const prediction = await cameras.model.estimateFaces(
        cameras.videoLive,
        false
      );

      // console.log(prediction);

      cameras.drawResults(cameras.ctx, prediction, true, true);
    } else {
      console.log("model not found");
      clearInterval(cameras.faceRunsInterval);
    }
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
    cameras.loader.style = "display:block";
    this.faceVerify = false;
    if (cameras.isRecording === false) {
      this.mediaRecorder.start();
      cameras.isRecording = true;
      var time = 5;
      this.startTimer(time, this._timer);
    }
  },
  reset: function () {
    this._timer.textContent = "recording: -_-";
    this.videoRecorded.style = "display:none";
    this.videoLive.style = "display:block";
    // cameras.loader.style = "display:block";
    this.faceVerify = false;

    cameras.mediaRecorder.stop();
    cameras.isRecording = false;
    clearInterval(cameras.timerInterval);
  },
  stop: function () {
    clearInterval(cameras.timerInterval);
    clearInterval(cameras.faceRunsInterval);
    cameras.mediaRecorder.stop();
    cameras.isRecording = false;

    cameras.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    cameras.faceVerify = true;
  },
};

cameras.init();
