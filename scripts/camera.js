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
  timer: null,
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
    cameras.timer = new _timerHandle(cameras.handleTimerStop);
    cameras.timer.reset(0);
    cameras.timer.mode(0);

    cameras.canvas = document.getElementById("canvas");
    cameras.ctx = cameras.canvas.getContext("2d");

    try {
      cameras.model = await blazeface.load();

      // cameras.model = await tf.loadGraphModel(
      //   "https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface"
      // );

      // console.log("model loaded: ", cameras.model);
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
        if (cameras.faceRunsInterval) {
          clearInterval(cameras.faceRunsInterval);
          console.log("clear faceRunsInterval");
        } else {
          console.log("init faceRunsInterval");
          cameras.faceRunsInterval = setInterval(cameras.detectFaces, 20);
        }
      });

      cameras.handleEvent();
    } catch (error) {
      console.log("init camera stream failure: ", error);
    }
  },
  handleTimer: function () {},
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
      if (prediction == undefined || prediction.length == 0) {
        cameras.reset();
        this._message.textContent = "không tìm thấy khuôn mặt trong khung hình";
      } else if (prediction.length > 1) {
        cameras.reset();
        this._message.textContent = "chỉ cho phép 1 khuôn mặt trong khung hình";
      } else if (prediction[0].landmarks.length == 6) {
        const probability = prediction[0].probability[0];
        const WIDTH = prediction[0].bottomRight[0] - prediction[0].topLeft[0];
        const HEIGHT = prediction[0].bottomRight[1] - prediction[0].topLeft[1];

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
          this._message.textContent = "...";
          cameras.start();
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
      this._message.textContent = error.toString();
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
      // clearInterval(cameras.faceRunsInterval);
    }
  },
  logTable: function (prediction) {
    const faceMattrix = prediction[0].landmarks;
    console.table([
      [
        cameras.label[0],
        `X:${Math.round(faceMattrix[0][0])} | Y:${Math.round(
          faceMattrix[0][1]
        )}`,
      ],
      [
        cameras.label[1],
        `X:${Math.round(faceMattrix[1][0])} | Y:${Math.round(
          faceMattrix[1][1]
        )}`,
      ],
      [
        cameras.label[2],
        `X:${Math.round(faceMattrix[2][0])} | Y:${Math.round(
          faceMattrix[2][1]
        )}`,
      ],
      [
        cameras.label[3],
        `X:${Math.round(faceMattrix[3][0])} | Y:${Math.round(
          faceMattrix[3][1]
        )}`,
      ],
      [
        cameras.label[4],
        `X:${Math.round(faceMattrix[4][0])} | Y:${Math.round(
          faceMattrix[4][1]
        )}`,
      ],
      [
        cameras.label[5],
        `X:${Math.round(faceMattrix[5][0])} | Y:${Math.round(
          faceMattrix[5][1]
        )}`,
      ],
      ["X", prediction[0].topLeft[0]],
      ["Y", prediction[0].topLeft[1]],
      ["WIDTH", WIDTH],
      ["HEIGHT", HEIGHT],
      ["PROBABILITY", probability],
    ]);
  },
  drawDetails: function (ctx, pred) {
    const eye = {
      left: {
        x: pred.landmarks[1][0],
        y: pred.landmarks[1][1],
      },
      right: {
        x: pred.landmarks[0][0],
        y: pred.landmarks[0][1],
      },
    };
    const nose = {
      x: pred.landmarks[2][0],
      y: pred.landmarks[2][1],
    };
    const mouth = {
      x: pred.landmarks[3][0],
      y: pred.landmarks[3][1],
    };
    const ear = {
      left: {
        x: pred.landmarks[5][0],
        y: pred.landmarks[5][1],
      },
      right: {
        x: pred.landmarks[4][0],
        y: pred.landmarks[4][1],
      },
    };
    // ctx.strokeStyle = GREEN;
    // ctx.lineWidth = 5;

    //#region parabol tu tai trai -20 -> midpoint -> tai phai
    const ear_extendlength = 20;
    ctx.moveTo(ear.left.x + ear_extendlength, ear.left.y);
    ctx.quadraticCurveTo(
      nose.x,
      nose.y - 60,
      ear.right.x - ear_extendlength,
      ear.right.y
    );
    //#endregion

    //tinh toa do trung diem cua 2 point
    function midpoint([x1, y1], [x2, y2]) {
      return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
      };
    }
    //#region parabol tu mom -> mui -> midpoint -40
    const midpoint_etendlength = 90;
    const midpoint_eye = midpoint(
      [eye.left.x, eye.left.y],
      [eye.right.x, eye.right.y]
    );
    ctx.moveTo(midpoint_eye.x, midpoint_eye.y - midpoint_etendlength);
    ctx.quadraticCurveTo(nose.x, nose.y, mouth.x, mouth.y + 60);
    //#endregion
    ctx.stroke();
  },
  startTimer: function (duration, display) {
    let timer = duration;
    let minutes;
    let seconds;

    if (cameras.timerInterval) {
      clearInterval(cameras.timerInterval);
    }

    cameras.timerInterval = setInterval(function () {
      minutes = parseInt(timer / 60, 10);
      seconds = parseInt(timer % 60, 10);

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      display.textContent = "recording: " + seconds;

      if (--timer < 0) {
        timer = 0;
        clearInterval(cameras.timerInterval);
        cameras.stop();
      }
    }, 1000);
  },
  start: function () {
    this.videoRecorded.style = "display:none";
    this.videoLive.style = "display:block";
    cameras.loader.style = "display:block";

    if (cameras.isRecording === false && this.faceVerify == false) {
      this.faceVerify = false;
      cameras.isRecording = true;

      this.mediaRecorder.start();
      this.startTimer(5, this._timer);
    }
  },
  reset: function () {
    this._timer.textContent = "recording: @_@";
    this.videoRecorded.style = "display:none";
    this.videoLive.style = "display:block";
    // cameras.loader.style = "display:block";
    cameras.mediaRecorder.stop();
    this.faceVerify = false;
    cameras.isRecording = false;
  },
  stop: function () {
    // cameras.mediaRecorder.stop();
    // clearInterval(cameras.faceRunsInterval);

    // cameras.stream.getTracks().forEach(function (track) {
    //   track.stop();
    // });

    // setTimeout(function () {
    // }, 100);

    cameras.isRecording = false;
    cameras.faceVerify = true;
  },
  handleTimerStop: function (time) {
    console.log("handleTimerStop call  => :", time);
    if (time == 0) {
      cameras.timer.stop();
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
  this.getStatus;
  {
    return status;
  }

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
