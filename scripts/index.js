function _timerHandle(callback) {
  var time = 0; //  The default time of the timer
  var mode = 1; //    Mode: count up or count down
  var status = 0; //    Status: timer is running or stoped
  var timer_id; //    This is used by setInterval function

  // this will start the timer ex. start the timer with 1 second interval timer.start(1000)
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

  //  Same as the name, this will stop or pause the timer ex. timer.stop()
  this.stop = function () {
    if (status == 1) {
      status = 0;
      clearInterval(timer_id);
    }
  };

  // Reset the timer to zero or reset it to your own custom time ex. reset to zero second timer.reset(0)
  this.reset = function (sec) {
    sec = typeof sec !== "undefined" ? sec : 0;
    time = sec;
    generateTime(time);
  };

  // Change the mode of the timer, count-up (1) or countdown (0)
  this.mode = function (tmode) {
    mode = tmode;
  };

  // This methode return the current value of the timer
  this.getTime = function () {
    return time;
  };

  // This methode return the current mode of the timer count-up (1) or countdown (0)
  this.getMode = function () {
    return mode;
  };

  // This methode return the status of the timer running (1) or stoped (1)
  this.getStatus = function () {
    return status;
  };

  // This methode will render the time variable to hour:minute:second format
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
  loader: null,
  confirm: null,
  faceVerify: false,
  mediaRecorder: null,
  videoLive: null,
  videoRecorded: null,
  stream: null,
  _timer: null,
  timer: null,
  RECSECONDS: 5,
  _message: null,
  model: null,
  device: null,
  canvas: null,
  ctx: null,
  isMediaRecorderSupported: false,
  faceRunsInterval: null,
  getMobileOperatingSystem: function () {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

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
    this.videoLive = document.querySelector("#videoLive");
    this.confirm = document.querySelector("#confirm");
    this.videoRecorded = document.querySelector("#videoRecorded");
    this._timer = document.querySelector("#timer");
    this._message = document.querySelector("#message");
    this.timer = new _timerHandle(this.handleTimer);
    this.timer.reset(cameras.RECSECONDS);
    this.timer.mode(0);

    this.device = cameras.getMobileOperatingSystem();

    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    try {
      this.model = await blazeface.load();
    } catch (error) {
      console.log("init faceDetection failure: ", error);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });

      this.videoLive.srcObject = stream;
      this.stream = stream;

      this.videoLive.addEventListener("loadeddata", async () => {
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
          this.videoRecorded.src = URL.createObjectURL(e.data);
          this.canvas.style = "display:none";
          this.confirm.style = "display:block";

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
        cameras.drawImageScaled(cameras.videoLive, ctx, prediction, false, false, false);
      } else if (prediction.length > 1) {
        this.reset();
        this._message.textContent = "chỉ cho phép 1 khuôn mặt trong khung hình";
        cameras.drawImageScaled(cameras.videoLive, ctx, prediction, true, false, false);
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
          cameras.drawImageScaled(cameras.videoLive, ctx, prediction, true, true, false);
        } else if (probability < 0.995) {
          this.reset();
          this._message.textContent = "vui lòng giữ khuôn mặt cách màn hình khoảng 30cm và không bị che";
          cameras.drawImageScaled(cameras.videoLive, ctx, prediction, false, true, true);
        } else {
          // this.start();
          this._message.textContent = "";
          cameras.drawImageScaled(cameras.videoLive, ctx, prediction, false, true, true);
        }
      }
    } catch (error) {
      cameras.reset();
      console.log("error while draw prediction: ", error);
      cameras._message.textContent = error.toString();
    }
  },
  drawImageScaled: function (frame, ctx, prediction, boundingBox, showKeypoints, showFaceLine) {
    // const ratio = Math.min(cameras.canvas.width / frame.width, cameras.canvas.height / frame.height);
    // const centerShift_x = (cameras.canvas.width - frame.width * ratio) / 2;
    // const centerShift_y = (cameras.canvas.height - frame.height * ratio) / 2;
    // ctx.drawImage(frame, 0, 0, frame.width, frame.height, centerShift_x, centerShift_y, frame.width * ratio, frame.height * ratio);

    ctx.clearRect(0, 0, cameras.canvas.width, cameras.canvas.height);

    let standard_deviation = { x: 0, y: 0 };

    if (cameras.device === "IOS") {
      standard_deviation = { x: 85, y: 85 };
    } else if (cameras.device === "ANDROID") {
      standard_deviation = { x: 85, y: 85 };
    }

    function translation(pos, axis) {
      if (axis === "OX") return pos + standard_deviation.x;
      else if (axis === "OY") return pos - standard_deviation.y;
      else return { x: pos.x + standard_deviation.x, y: pos - standard_deviation.y };
    }

    prediction.map((pred) => {
      if (boundingBox) {
        ctx.beginPath();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = "4";
        ctx.roundRect(translation(pred.topLeft[0], "OX"), translation(pred.topLeft[1], "OY"), pred.bottomRight[0] - pred.topLeft[0], pred.bottomRight[1] - pred.topLeft[1], 8);
        ctx.stroke();
      }

      if (showKeypoints) {
        ctx.fillStyle = cameras.RED;
        pred.landmarks.map((landmark) => {
          ctx.fillRect(translation(landmark[0], "OX"), translation(landmark[1], "OY"), 4, 4);
        });
      }

      if (showFaceLine) {
        // const eye = { left: { x: translation(pred.landmarks[1][0], "OX"), y: translation(pred.landmarks[1][1], "OY") }, right: { x: translation(pred.landmarks[0][0], "OX"), y: translation(pred.landmarks[0][1], "OY") } };
        // const ear = { left: { x: translation(pred.landmarks[5][0], "OX"), y: translation(pred.landmarks[5][1], "OY") }, right: { x: translation(pred.landmarks[4][0], "OX"), y: translation(pred.landmarks[4][1], "OY") } };
        // const mouth = { x: translation(pred.landmarks[3][0], "OX"), y: translation(pred.landmarks[3][1], "OY") };
        const nose = { x: translation(pred.landmarks[2][0], "OX"), y: translation(pred.landmarks[2][1], "OY") };

        ctx.beginPath();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = "3";
        ctx.filter = "blur(1px)";
        //horizon parabol
        ctx.moveTo(cameras.canvas.width - 90, cameras.canvas.height / 2);
        ctx.quadraticCurveTo(nose.x, nose.y - 80, 90, cameras.canvas.height / 2);
        //vertical parabol
        ctx.moveTo(cameras.canvas.width / 2, 5);
        ctx.quadraticCurveTo(nose.x, nose.y - 80, cameras.canvas.width / 2, cameras.canvas.height - 5);

        ctx.stroke();
      }
    });
  },
  detectFaces: async function () {
    try {
      // const estimationConfig = { flipHorizontal: true };
      const prediction = await cameras.model.estimateFaces(cameras.videoLive, false);

      cameras.processResults(cameras.ctx, prediction);
    } catch (error) {
      console.log("model not found: ", error);
      // clearInterval(cameras.faceRunsInterval);
    }
  },
  start: function () {
    if (this.isMediaRecorderSupported) {
      if (cameras.timer.getStatus() == 0 && cameras.stream.active) {
        cameras.timer.start(1000);
        cameras.mediaRecorder.start();
      }
      // cameras.videoRecorded.style = "display:none";
      // cameras.videoLive.style = "display:block";}
    } else {
      this._message.textContent = "MediaRecorder is not supported";
    }
  },
  reset: function () {
    if (this.isMediaRecorderSupported) {
      cameras.timer.stop();
      cameras.timer.reset(cameras.RECSECONDS);
      cameras.mediaRecorder.stop();

      cameras.videoRecorded.style = "display:none";
      cameras.videoLive.style = "display:block";

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

      cameras.videoRecorded.style = "display:block";
      cameras.videoLive.style = "display:none";
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
