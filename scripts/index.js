function _timerHandle(callback) {
  var time = 0; //  The default time of the timer
  var mode = 1; //    Mode: count up or count down
  var status = 0; //    Status: timer is running or stoped
  var timer_id; //    This is used by setInterval function

  this.start = function (interval) {
    interval = typeof interval !== "undefined" ? interval : 1000;

    if (status == 0) {
      status = 1;
      timer_id = setInterval(function () {
        switch (mode) {
          default:
            if (time) {
              time--;
              generateTime();
              if (typeof callback === "function") callback(time);
            }
            break;

          case 1:
            if (time < 86400) {
              time++;
              generateTime();
              if (typeof callback === "function") callback(time);
            }
            break;
        }
      }, interval);
    }
  };

  this.stop = function () {
    if (status == 1) {
      status = 0;
      clearInterval(timer_id);
    }
  };

  this.reset = function (sec) {
    sec = typeof sec !== "undefined" ? sec : 0;
    time = sec;
    generateTime(time);
  };

  this.mode = function (tmode) {
    mode = tmode;
  };

  this.getTime = function () {
    return time;
  };

  this.getMode = function () {
    return mode;
  };

  this.getStatus = function () {
    return status;
  };

  function generateTime() {
    var second = time % 60;
    var minute = Math.floor(time / 60) % 60;
    var hour = Math.floor(time / 3600) % 60;

    second = second < 10 ? "0" + second : second;
    minute = minute < 10 ? "0" + minute : minute;
    hour = hour < 10 ? "0" + hour : hour;
  }
}

const cameras = {
  GREEN: "#32EEDB",
  RED: "#FF2C35",
  BLUE: "#157AB3",
  _confirm: null,
  _videoLive: null,
  _videoRecorded: null,
  _message: null,
  _timer: null,
  _canvas: null,
  _loader: null,
  timer: null,
  RECSECONDS: 5,
  faceVerify: false,
  isMediaRecorderSupported: false,
  preTrainModel: null,
  device: null,
  ctx: null,
  stream: null,
  mediaRecorder: null,
  faceRunsInterval: null,
  standardDeviation: { x: 0, y: 0 },
  getMobileOperatingSystem: function () {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    console.log(userAgent);

    if (/windows phone/i.test(userAgent)) {
      return "Windows Phone";
    }
    if (/android/i.test(userAgent)) {
      return "ANDROID";
    }
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return "IOS";
    }

    return "unknown";
  },
  init: async function () {
    this._videoLive = document.querySelector("#videoLive");
    this._confirm = document.querySelector("#confirm");
    this._videoRecorded = document.querySelector("#videoRecorded");
    this._timer = document.querySelector("#timer");
    this._message = document.querySelector("#message");
    this._canvas = document.getElementById("canvas");

    this.timer = new _timerHandle(this.handleTimer);
    this.timer.reset(cameras.RECSECONDS);
    this.timer.mode(0);
    this.device = cameras.getMobileOperatingSystem();
    this.ctx = this._canvas.getContext("2d");

    if (this.device === "IOS" || this.device === "ANDROID") {
      cameras.standardDeviation = { x: 85, y: 85 };
    }

    try {
      this.preTrainModel = await blazeface.load();
    } catch (error) {
      console.log("init faceDetection failure: ", error);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });

      this._videoLive.srcObject = stream;
      this.stream = stream;

      this._videoLive.addEventListener("loadeddata", async () => {
        if (this.faceRunsInterval) {
          clearInterval(this.faceRunsInterval);
          console.log("clear faceRunsInterval");
        } else {
          console.log("init faceRunsInterval");
          this.faceRunsInterval = setInterval(this.detectFaces, 50);
        }
      });

      this.handleEvent();
    } catch (error) {
      console.log("init camera stream failure: ", error);
    }
  },
  handleEvent: async function () {
    try {
      var options;
      if (MediaRecorder.isTypeSupported("video/mp4")) {
        options = { mimeType: "video/mp4" }; // videoBitsPerSecond: 100000
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        options = { mimeType: "video/webm" };
      } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8")) {
        options = { mimeType: "video/webm; codecs=vp8" };
      } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp9")) {
        options = { mimeType: "video/webm; codecs=vp9" };
      } else {
        console.error("no suitable mimetype found for this device");
        this._message.textContent = "MediaRecorder is not supported";
      }

      if (options) {
        this.isMediaRecorderSupported = true;
        this._message.textContent = "mimeType: " + options.mimeType;
        this.mediaRecorder = new MediaRecorder(cameras.stream, options);
      }

      this.mediaRecorder.addEventListener("dataavailable", (e) => {
        if (this.faceVerify == true) {
          this._videoRecorded.src = URL.createObjectURL(e.data);
          this._canvas.style = "display:none";
          this._confirm.style = "display:block";

          if (this.device === "ANDROID") {
            // var blob = new Blob(e.data, { type: "video/mp4" });
            // this.videoRecorded.src = URL.createObjectURL(blob); //
          }
        }
      });
    } catch (error) {
      this._message.textContent = "MediaRecorder is not supported: " + error.toString();
      console.log(error);
    }
  },
  processResults: function (ctx, prediction) {
    // console.log("pred => ", prediction);
    try {
      if (prediction == undefined || prediction.length == 0) {
        this.reset();
        this._message.textContent = "không tìm thấy khuôn mặt trong khung hình";
        cameras.drawImageScaled(cameras._videoLive, ctx, prediction, false, false, false);
      } else if (prediction.length > 1) {
        this.reset();
        this._message.textContent = "chỉ cho phép 1 khuôn mặt trong khung hình";
        cameras.drawImageScaled(cameras._videoLive, ctx, prediction, true, false, false);
      } else {
        const probability = prediction[0].probability[0];

        if (
          prediction[0].topLeft[0] < 30 || //x->
          prediction[0].topLeft[0] > 290 || //x<-
          prediction[0].topLeft[1] < 0 || //y->
          prediction[0].topLeft[1] > 250 //y-<
        ) {
          this.reset();
          this._message.textContent = "Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 30cm";
          cameras.drawImageScaled(cameras._videoLive, ctx, prediction, true, true, false);
        } else if (probability < 0.995) {
          this.reset();
          this._message.textContent = "vui lòng giữ khuôn mặt cách màn hình khoảng 30cm và không bị che";
          cameras.drawImageScaled(cameras._videoLive, ctx, prediction, false, true, true);
        } else {
          this.start();
          this._message.textContent = "";
          cameras.drawImageScaled(cameras._videoLive, ctx, prediction, false, true, true);
        }
      }
    } catch (error) {
      cameras.reset();
      console.log("error while draw prediction: ", error);
      cameras._message.textContent = error.toString();
    }
  },
  translation: function (pos, axis) {
    switch (axis) {
      case "OX":
        return pos + cameras.standardDeviation.x;
      case "OY":
        return pos - cameras.standardDeviation.y;
      default:
        return { x: pos.x + cameras.standardDeviation.x, y: pos - cameras.standardDeviation.y };
    }
  },
  drawImageScaled: function (frame, ctx, prediction, boundingBox, showKeypoints, showFaceLine) {
    ctx.clearRect(0, 0, cameras._canvas.width, cameras._canvas.height);

    prediction.map((pred) => {
      if (boundingBox) {
        ctx.beginPath();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = "4";

        try {
          ctx.roundRect(cameras.translation(pred.topLeft[0], "OX"), cameras.translation(pred.topLeft[1], "OY"), pred.bottomRight[0] - pred.topLeft[0], pred.bottomRight[1] - pred.topLeft[1], [8.0]);
        } catch (error) {
          ctx.rect(cameras.translation(pred.topLeft[0], "OX"), cameras.translation(pred.topLeft[1], "OY"), pred.bottomRight[0] - pred.topLeft[0], pred.bottomRight[1] - pred.topLeft[1]);
        }
        ctx.stroke();
      }

      if (showKeypoints) {
        ctx.fillStyle = cameras.RED;
        pred.landmarks.map((landmark) => {
          ctx.fillRect(cameras.translation(landmark[0], "OX"), cameras.translation(landmark[1], "OY"), 4, 4);
        });
      }

      if (showFaceLine) {
        // const eye = { left: { x: cameras.translation(pred.landmarks[1][0], "OX"), y: cameras.translation(pred.landmarks[1][1], "OY") }, right: { x: cameras.translation(pred.landmarks[0][0], "OX"), y: cameras.translation(pred.landmarks[0][1], "OY") } };
        // const ear = { left: { x: cameras.translation(pred.landmarks[5][0], "OX"), y: cameras.translation(pred.landmarks[5][1], "OY") }, right: { x: cameras.translation(pred.landmarks[4][0], "OX"), y: cameras.translation(pred.landmarks[4][1], "OY") } };
        // const mouth = { x: cameras.translation(pred.landmarks[3][0], "OX"), y: cameras.translation(pred.landmarks[3][1], "OY") };
        const nose = { x: cameras.translation(pred.landmarks[2][0], "OX"), y: cameras.translation(pred.landmarks[2][1], "OY") };

        ctx.beginPath();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = "1";
        ctx.filter = "blur(1px)";

        ctx.moveTo(cameras._canvas.width - 90, cameras._canvas.height / 2);
        ctx.quadraticCurveTo(nose.x, nose.y - 80, 90, cameras._canvas.height / 2);
        ctx.moveTo(cameras._canvas.width / 2, 5);
        ctx.quadraticCurveTo(nose.x, nose.y - 80, cameras._canvas.width / 2, cameras._canvas.height - 5);

        ctx.stroke();
      }
    });
  },
  detectFaces: async function () {
    try {
      // const estimationConfig = { flipHorizontal: true };
      const prediction = await cameras.preTrainModel.estimateFaces(cameras._videoLive, false);

      cameras.processResults(cameras.ctx, prediction);
    } catch (error) {
      console.log("preTrainModel not found: ", error);
      // clearInterval(cameras.faceRunsInterval);
    }
  },
  start: function () {
    if (this.isMediaRecorderSupported) {
      if (cameras.timer.getStatus() == 0 && cameras.stream.active) {
        cameras.timer.start(1000);
        cameras.mediaRecorder.start();
      }
    } else {
      this._message.textContent = "MediaRecorder is not supported";
    }
  },
  reset: function () {
    if (this.isMediaRecorderSupported) {
      cameras.timer.stop();
      cameras.timer.reset(cameras.RECSECONDS);
      cameras.mediaRecorder.stop();

      cameras._videoRecorded.style = "display:none";
      cameras._videoLive.style = "display:block";

      if (cameras.faceVerify) {
        //init Detectface
      }
    } else {
      this._message.textContent = "MediaRecorder is not supported";
    }
  },
  stop: function () {
    if (this.isMediaRecorderSupported) {
      clearInterval(cameras.faceRunsInterval);

      cameras.timer.stop();
      cameras.mediaRecorder.stop();
      cameras.faceVerify = true;

      cameras.stream.getTracks().forEach(function (track) {
        track.stop();
      });

      cameras._videoRecorded.style = "display:block";
      cameras._videoLive.style = "display:none";
    } else {
      this._message.textContent = "MediaRecorder is not supported";
    }
  },
  handleTimer: function (time) {
    cameras._timer.textContent = "recording: " + time + " s";
    if (time == 0) {
      cameras.stop();
      cameras._timer.textContent = "face recorded";
    }
  },
};
