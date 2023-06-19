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
  RECSECONDS: 6,
  _message: null,
  model: null,
  canvas: null,
  ctx: null,
  isRecording: false,
  faceRunsInterval: null,
  init: async function () {
    this.videoLive = document.querySelector("#videoLive");
    // this.loader = document.querySelector("#loader");
    this.confirm = document.querySelector("#confirm");
    this.videoRecorded = document.querySelector("#videoRecorded");
    this._timer = document.querySelector("#timer");
    this._message = document.querySelector("#message");
    this.timer = new _timerHandle(this.handleTimer);
    this.timer.reset(this.RECSECONDS);
    this.timer.mode(0);

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
          this.faceRunsInterval = setInterval(this.detectFaces, 100);
        }
      });

      this.handleEvent();
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

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "video/webm",
      });

      this.mediaRecorder.addEventListener("dataavailable", (event) => {
        if (this.faceVerify == true) {
          this.videoRecorded.src = URL.createObjectURL(event.data); // <6>
          this.canvas.style = "display:none";
          this.confirm.style = "display:block";
        }
      });
    } catch (error) {
      this._message.textContent = "MediaRecorder is not supported";
      console.log(error);
    }
  },
  drawResults: function (ctx, prediction, boundingBox, showKeypoints) {
    // console.log("pred => ", prediction);
    try {
      if (prediction == undefined || prediction.length == 0) {
        this.reset();
        this._message.textContent = "không tìm thấy khuôn mặt trong khung hình";
      } else if (prediction.length > 1) {
        this.reset();
        this._message.textContent = "chỉ cho phép 1 khuôn mặt trong khung hình";
      } else if (prediction[0].landmarks.length == 6) {
        const probability = prediction[0].probability[0];

        if (
          prediction[0].topLeft[0] < 30 || //x->
          prediction[0].topLeft[0] > 290 || //x<-
          prediction[0].topLeft[1] < 0 || //y->
          prediction[0].topLeft[1] > 250 //y-<
        ) {
          this._message.textContent = "Giữ cho khuôn mặt ở chính giữa màn hình";
          this.reset();
        } else if (probability < 0.995) {
          //check percentage output
          this._message.textContent =
            "vui lòng giữ khuôn mặt cách màn hình khoảng 30cm và không bị che";
          this.reset();
        } else {
          this._message.textContent = "...";
          this.start();
        }

        ctx.drawImage(this.videoLive, 0, 0, 650, 480);
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
            //drawing 6 point of face
            pred.landmarks.forEach((landmark) => {
              ctx.fillRect(landmark[0], landmark[1], 4, 4);
            });
          }
        });
      }
    } catch (error) {
      cameras.reset();
      console.log("error while draw prediction: ", error);
      cameras._message.textContent = error.toString();
    }
  },
  detectFaces: async function () {
    try {
      // const estimationConfig = { flipHorizontal: true };
      const prediction = await cameras.model.estimateFaces(
        cameras.videoLive,
        false
      );

      cameras.drawResults(cameras.ctx, prediction, true, true);
    } catch (error) {
      console.log("model not found: ", error);
      clearInterval(cameras.faceRunsInterval);
    }
  },
  start: function () {
    if (cameras.timer.getStatus() == 0) {
      cameras.timer.start(1000);
      cameras.mediaRecorder.start();

      // cameras.videoRecorded.style = "display:none";
      // cameras.videoLive.style = "display:block";
    }
  },
  reset: function () {
    cameras.timer.stop();
    cameras.timer.reset(cameras.RECSECONDS);
    cameras.mediaRecorder.stop();

    cameras.videoRecorded.style = "display:none";
    cameras.videoLive.style = "display:block";

    if (cameras.faceVerify) {
      //init Detectface
    }
  },
  stop: function () {
    clearInterval(cameras.faceRunsInterval);

    cameras.timer.stop();
    cameras.mediaRecorder.stop();
    cameras.faceVerify = true;

    cameras.stream.getTracks().forEach(function (track) {
      track.stop();
    });

    cameras.videoRecorded.style = "display:block";
    cameras.videoLive.style = "display:none";
  },
  handleTimer: function (time) {
    cameras._timer.textContent = "recording: " + time + " s";
    if (time == 0) {
      cameras.stop();
      cameras._timer.textContent = "face recorded";
    }
  },
};

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
