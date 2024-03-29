const LoadingAnimation = {
  renderStyle: function () {
    document.querySelector("body").innerHTML += `
          <style>
              .container-loader {position: fixed;width: 100%;top: 0;bottom: 0;display: none;background-color: rgb(0 0 0 / 0.4);justify-content: center;align-items: center;z-index:99999;}
              .loading i {width: 20px;height: 20px; display: inline-block;border-radius: 50%; background: #3079FF;}
              .loading i:first-child {animation: loading-ani2 0.5s linear infinite; opacity: 0;transform: translate(-20px); }
              .loading i:nth-child(2),
              .loading i:nth-child(3) { animation: loading-ani3 0.5s linear infinite;}
              .loading i:last-child { animation: loading-ani1 0.5s linear infinite;}
              @keyframes loading-ani1 {100% { transform: translate(40px);opacity: 0;}}
              @keyframes loading-ani2 {100% {transform: translate(20px); opacity: 1;}}
              @keyframes loading-ani3 {100% {transform: translate(20px);}}
              @media only screen and (min-width: 100%) {.container-loader {width: 100%;} .profile-layout .modal-screen { max-width: 100%;} }
          </style>
      `;
  },
  renderElement: function () {
    document.querySelector("body").innerHTML += `
          <div class="container-loader">
              <div class="loading"><i></i><i></i><i></i><i></i></div>
                <div class="ani1"><i></i><i></i><i></i></div>
                <div class="ani2"><i></i><i></i><i></i></div>
                <div class="ani3"><i></i><i></i><i></i></div>
                <div class="ani4"><i></i><i></i><i></i></div>
          </div>
      `;
  },
  display: function () {
    document.querySelector(".container-loader").style = "display:flex; z-index: 9999;";
  },
  dispose: function () {
    document.querySelector(".container-loader").style.display = "none";
  },
  start: function () {
    this.renderStyle();
    this.renderElement();
    this.dispose();
  },
};

const cameras = {
  themes: {
    main: "#3079FF",
    primary: "#EAF1FF",
  },
  frames: {
    width: 470,
    height: 660,
    option: 0,
  },
  _videoLive: null,
  _faceRecord: null,
  _confirm: null,
  _retake: null,
  _faceAuthenForm: null,
  _mediaRecorded: null,
  _message: null,
  _snap: null,
  isMediaRecorderSupported: false,
  preTrainModel: null,
  device: null,
  stream: null,
  mediaRecorder: null,
  standardDeviation: { x: 0, y: 0 },
  init: async function () {
    LoadingAnimation.start();
    LoadingAnimation.display();
    this._faceAuthenForm = document.querySelector("#FaceAuthenForm");
    this._videoLive = document.querySelector("#videoLive");
    this._confirm = document.querySelector("#confirm");
    this._retake = document.querySelector("#retake");
    this._message = document.querySelector("#message");
    this._faceRecord = document.querySelector("#faceRecord");
    this._snap = document.querySelector("#snap");

    this.device = cameras.getMobileOperatingSystem();
    this._mediaRecorded = document.querySelector("#imageRecorded");

    try {
      this.preTrainModel = await blazeface.load();
    } catch (error) {
      console.log("init faceDetection failure: ", error);
    }

    // cameras.standardDeviation = { x: 175, y: -40 };

    await cameras.startAndroidStream();
    cameras.handleAndroidEvent();

    LoadingAnimation.dispose();
  },
  startAndroidStream: async function () {
    try {
      // LoadingAnimation.display();
      const livecamera = document.querySelector("#my_camera");
      // this._message.textContent = "Chụp ảnh chính diện khuôn mặt";

      Webcam.set({
        width: this.frames.width,
        height: this.frames.height,
        dest_width: null,
        dest_height: null,
        image_format: "jpeg",
        jpeg_quality: 90,
        force_flash: false,
        flip_horiz: true,
        fps: 45,
      });

      Webcam.attach(livecamera);
      LoadingAnimation.dispose();
    } catch (error) {
      console.log("init camera stream failure: ", error);
      this._message.textContent = "Trình duyệt không hỗ trợ camera: " + error.toString();
      LoadingAnimation.dispose();
    }
  },
  handleAndroidEvent: function () {
    try {
      LoadingAnimation.display();
      Webcam.on("load", function () {
        const livecam = document.querySelectorAll("#my_camera video");
        livecam[0].style.transform = "none";
        livecam[0].width = cameras.frames.width;
        livecam[0].height = cameras.frames.height;

        cameras._videoLive = livecam[0];
        // cameras._canvas.style.transform = "none";
        cameras._videoLive.classList.add("videostream");
      });

      Webcam.on("live", function () {
        cameras._snap.style = "display:block";
        cameras._retake.style = "display:none";
        cameras._confirm.style = "display:none";
        cameras._mediaRecorded.style = "display:none";
      });

      Webcam.on("error", function (err) {
        console.log("error: ", err);
      });

      this._retake.addEventListener("click", function () {
        LoadingAnimation.display();
        cameras.startAndroidStream();
        Webcam.unfreeze();
      });

      this._confirm.addEventListener("click", function () {
        LoadingAnimation.display();
      });

      this._snap.addEventListener("click", function () {
        LoadingAnimation.display();
        cameras._message.innerHTML = `<strong style="color:${cameras.themes.main}">Loading...</strong>`;
        cameras._snap.style = "display:none";
        cameras._retake.style = "display:block";
        cameras._mediaRecorded.style = "display:block";

        Webcam.set({
          dest_width: cameras.frames.width,
          dest_height: cameras.frames.height, //+ 360
        });

        Webcam.freeze();
        Webcam.snap(async function (data_uri, frame, context) {
          cameras._mediaRecorded.src = data_uri;

          Webcam.reset();

          const prediction = await cameras.preTrainModel.estimateFaces(frame, false);
          cameras.processFrameResults(cameras.ctx, frame, prediction);
          LoadingAnimation.dispose();
        });
      });
    } catch (error) {
      console.log(error);
      LoadingAnimation.dispose();
      this._message.textContent = error.toString();
    }
  },
  detectFaces: async function () {
    try {
      // const estimationConfig = { flipHorizontal: true };
      const prediction = await cameras.preTrainModel.estimateFaces(cameras._videoLive, false);

      cameras.processLivenessResults(cameras.ctx, cameras._videoLive, prediction);
    } catch (error) {
      console.log("preTrainModel not found: ", error);
    }
  },
  processLivenessResults: function (ctx, livecam, prediction) {
    try {
      if (prediction == undefined || prediction.length == 0) {
        this.reset("Không tìm thấy khuôn mặt trong khung hình");
        cameras.canvasHelper.drawResult(livecam, ctx, prediction, false, false, false);
      } else if (prediction.length > 1) {
        this.reset("Chỉ cho phép 1 khuôn mặt trong khung hình");
        cameras.canvasHelper.drawResult(livecam, ctx, prediction, true, false, false);
      } else {
        const probability = prediction[0].probability[0];

        if (prediction[0].topLeft[0] < 30 || prediction[0].topLeft[0] > 290 || prediction[0].topLeft[1] < 0 || prediction[0].topLeft[1] > 250 || probability < (cameras.device == "IOS" ? 0.995 : 0.998)) {
          this.reset("Giữ cho khuôn mặt ở chính giữa màn hình và không bị che");

          cameras.canvasHelper.drawResult(livecam, ctx, prediction, true, true, false);
        } else {
          let mss = "";
          this.start();
          const timing = cameras.timer.getTime();
          if (timing > 4) mss = `<p>Nhìn sang <strong style="color:${cameras.themes.main}">trái</strong> màn hình</p>`;
          else if (timing <= 4 && timing > 2) mss = `<p>Nhìn <strong style="color:${cameras.themes.main}">thẳng</strong> vào màn hình</p>`;
          else if (timing <= 2 && timing > 0) mss = `<p>Nhìn sang <strong style="color:${cameras.themes.main}">phải</strong> màn hình</p>`;
          else mss = "Thực hiện thành công";

          this._message.innerHTML = mss;
          cameras.canvasHelper.drawResult(livecam, ctx, prediction, false, true, true);
        }
      }
    } catch (error) {
      cameras.reset();
      console.log("error while draw prediction: ", error);
      cameras._message.textContent = error.toString();
    }
  },
  processFrameResults: function (ctx, frame, prediction) {
    try {
      if (prediction == undefined || prediction.length == 0) {
        this.reset("Không tìm thấy khuôn mặt trong khung hình vui lòng chụp lại ảnh");
      } else if (prediction.length > 1) {
        this.reset("Chỉ cho phép 1 khuôn mặt trong khung hình vui lòng chụp lại ảnh");
      } else {
        const probability = prediction[0].probability[0];

        if (prediction[0].topLeft[0] < 30) {
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
          //left
        } else if (prediction[0].topLeft[0] > 290) {
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
          //right
        } else if (prediction[0].topLeft[1] < 100) {
          // top
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
        } else if (prediction[0].topLeft[1] > 360) {
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
          //bottom
          // this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
        } else if (probability < 0.999) {
          this.reset("Giữ cho khuôn mặt không bị che chắn và cách màn hình khoảng 25cm");
        } else {
          this._message.innerHTML = "Thực hiện thành công";
          cameras._confirm.style = "display:block";

          const loadFileToDocument = async function () {
            const response = await fetch(cameras._mediaRecorded.src);
            const blob = await response.blob();
            const fileName = cameras.generateUUID();

            const file = new File([blob], `${fileName}.jpg`, {
              type: "image/jpeg",
              lastModified: new Date(),
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            cameras._faceRecord.files = dataTransfer.files;
          };

          loadFileToDocument();
        }
      }
    } catch (error) {
      // cameras.reset();
      console.log("error while draw prediction: ", error);
      cameras._message.textContent = error.toString();
    }
  },
  canvasHelper: {
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
    drawCircle: function (ctx, percentage) {
      // ctx.beginPath();
      // ctx.arc(cameras._canvas.width / 2, cameras._canvas.height / 2, cameras._canvas.height / 2 + 1, percentage * Math.PI, 1.5 * Math.PI);
      // ctx.strokeStyle = cameras.RED;
      // ctx.lineWidth = 8;
      // ctx.stroke();
    },
    roundRect: function (ctx, x, y, width, height, radius = 8, fill = false, stroke = true) {
      if (typeof radius === "number") {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
      } else {
        radius = { ...{ tl: 0, tr: 0, br: 0, bl: 0 }, ...radius };
      }
      ctx.beginPath();
      ctx.moveTo(x + radius.tl, y);
      ctx.lineTo(x + width - radius.tr, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
      ctx.lineTo(x + width, y + height - radius.br);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
      ctx.lineTo(x + radius.bl, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
      ctx.lineTo(x, y + radius.tl);
      ctx.quadraticCurveTo(x, y, x + radius.tl, y);
      ctx.closePath();
      if (fill) {
        ctx.fill();
      }
      if (stroke) {
        ctx.stroke();
      }
    },
    drawResult: function (frame, ctx, prediction, boundingBox, showKeypoints, showFaceLine) {
      ctx.clearRect(0, 0, cameras._canvas.width, cameras._canvas.height);

      prediction.map((pred) => {
        if (boundingBox) {
          ctx.beginPath();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = "4";

          try {
            ctx.roundRect(this.translation(pred.topLeft[0], "OX"), this.translation(pred.topLeft[1], "OY"), pred.bottomRight[0] - pred.topLeft[0], pred.bottomRight[1] - pred.topLeft[1], [8]);
          } catch (error) {
            this.roundRect(ctx, this.translation(pred.topLeft[0], "OX"), this.translation(pred.topLeft[1], "OY"), pred.bottomRight[0] - pred.topLeft[0], pred.bottomRight[1] - pred.topLeft[1], 8, false, false);
          }

          ctx.stroke();
        }

        if (showKeypoints) {
          ctx.fillStyle = "#FF2C35";
          pred.landmarks.map((landmark) => {
            ctx.fillRect(this.translation(landmark[0], "OX"), this.translation(landmark[1], "OY"), 4, 4);
          });
        }

        if (showFaceLine) {
          // const eye = { left: { x: this.translation(pred.landmarks[1][0], "OX"), y: this.translation(pred.landmarks[1][1], "OY") }, right: { x: this.translation(pred.landmarks[0][0], "OX"), y: this.translation(pred.landmarks[0][1], "OY") } };
          // const ear = { left: { x: this.translation(pred.landmarks[5][0], "OX"), y: this.translation(pred.landmarks[5][1], "OY") }, right: { x: this.translation(pred.landmarks[4][0], "OX"), y: this.translation(pred.landmarks[4][1], "OY") } };
          // const mouth = { x: this.translation(pred.landmarks[3][0], "OX"), y: this.translation(pred.landmarks[3][1], "OY") };
          const nose = { x: this.translation(pred.landmarks[2][0], "OX"), y: this.translation(pred.landmarks[2][1], "OY") };

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
  },
  generateUUID: function () {
    var d = new Date().getTime();
    var d2 = (typeof performance !== "undefined" && performance.now && performance.now() * 1000) || 0;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16;
      if (d > 0) {
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  },
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
  reset: function (message = "") {
    cameras._message.textContent = message;
    cameras.faceVerify = false;

    this._confirm.style = "display:none";
  },
};

const frame = {
  themes: {
    main: "#3079FF",
    primary: "#EAF1FF",
  },
  frame: {
    width: "650px",
    height: "480px",
  },
  _confirm: null,
  _retake: null,
  _faceAuthenForm: null,
  _mediaRecorded: null,
  _message: null,
  _canvas: null,
  _loader: null,
  _snap: null,
  faceVerify: false,
  isMediaRecorderSupported: false,
  preTrainModel: null,
  device: null,
  ctx: null,
  stream: null,
  mediaRecorder: null,
  faceRunsInterval: null,
  progressInterval: null,
  standardDeviation: { x: 0, y: 0 },
  init: async function (option) {
    LoadingAnimation.start();
    LoadingAnimation.display();
    this._faceAuthenForm = document.querySelector("#FaceAuthenForm");
    this._videoLive = document.querySelector("#videoLive");
    this._confirm = document.querySelector("#confirm");
    this._retake = document.querySelector("#retake");
    this._message = document.querySelector("#message");
    this._snap = document.querySelector("#snap");

    this.device = cameras.getMobileOperatingSystem();
    this.ctx = this._canvas.getContext("2d");
    this._mediaRecorded = document.querySelector("#imageRecorded");

    try {
      this.preTrainModel = await blazeface.load();
    } catch (error) {
      console.log("init faceDetection failure: ", error);
    }

    // cameras.standardDeviation = { x: 175, y: -40 };

    await cameras.startAndroidStream();
    cameras.handleAndroidEvent();

    LoadingAnimation.dispose();
  },
  startAndroidStream: async function () {
    try {
      // LoadingAnimation.display();
      const livecamera = document.querySelector("#my_camera");
      // this._message.textContent = "Chụp ảnh chính diện khuôn mặt";

      Webcam.set({
        width: cameras.frames.width,
        height: cameras.frames.height,
        dest_width: null,
        dest_height: null,
        image_format: "jpeg",
        jpeg_quality: 90,
        force_flash: false,
        flip_horiz: true,
        fps: 45,
      });

      Webcam.attach(livecamera);
      LoadingAnimation.dispose();
    } catch (error) {
      console.log("init camera stream failure: ", error);
      this._message.textContent = "Trình duyệt không hỗ trợ camera: " + error.toString();
      LoadingAnimation.dispose();
    }
  },
  handleAndroidEvent: function () {
    try {
      LoadingAnimation.display();
      Webcam.on("load", function () {
        const livecam = document.querySelectorAll("#my_camera video");
        livecam[0].style.transform = "none";
        livecam[0].width = cameras._videoLive.width;
        livecam[0].height = cameras._videoLive.height;

        cameras._videoLive = livecam[0];
        // cameras._canvas.style.transform = "none";
        // cameras._videoLive.classList.add("videostream");
      });

      Webcam.on("live", function () {
        cameras._snap.style = "display:block";
        cameras._retake.style = "display:none";
        cameras._confirm.style = "display:none";
        cameras._mediaRecorded.style = "display:none";
      });

      Webcam.on("error", function (err) {
        console.log("error: ", err);
      });

      this._retake.addEventListener("click", function () {
        LoadingAnimation.display();
        cameras.startAndroidStream();
        Webcam.unfreeze();
      });

      this._confirm.addEventListener("click", function () {
        LoadingAnimation.display();
      });

      this._snap.addEventListener("click", function () {
        LoadingAnimation.display();
        cameras._message.innerHTML = `<strong style="color:${cameras.themes.main}">Loading...</strong>`;
        cameras._snap.style = "display:none";
        cameras._retake.style = "display:block";
        cameras._mediaRecorded.style = "display:block";

        Webcam.set({
          dest_width: cameras._videoLive.width,
          dest_height: cameras._videoLive.height, //+ 360
        });

        Webcam.freeze();
        Webcam.snap(async function (data_uri, frame, context) {
          cameras._mediaRecorded.src = data_uri;

          Webcam.reset();

          const prediction = await cameras.preTrainModel.estimateFaces(frame, false);
          cameras.processFrameResults(cameras.ctx, frame, prediction);
          LoadingAnimation.dispose();
        });
      });
    } catch (error) {
      console.log(error);
      LoadingAnimation.dispose();
      this._message.textContent = error.toString();
    }
  },
  detectFaces: async function () {
    try {
      // const estimationConfig = { flipHorizontal: true };
      const prediction = await cameras.preTrainModel.estimateFaces(cameras._videoLive, false);

      cameras.processLivenessResults(cameras.ctx, cameras._videoLive, prediction);
    } catch (error) {
      console.log("preTrainModel not found: ", error);
    }
  },
  processFrameResults: function (ctx, frame, prediction) {
    try {
      if (prediction == undefined || prediction.length == 0) {
        this.reset("Không tìm thấy khuôn mặt trong khung hình vui lòng chụp lại ảnh");
      } else if (prediction.length > 1) {
        this.reset("Chỉ cho phép 1 khuôn mặt trong khung hình vui lòng chụp lại ảnh");
      } else {
        const probability = prediction[0].probability[0];

        if (prediction[0].topLeft[0] < 30) {
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
          //left
        } else if (prediction[0].topLeft[0] > 290) {
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
          //right
        } else if (prediction[0].topLeft[1] < 100) {
          // top
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
        } else if (prediction[0].topLeft[1] > 360) {
          this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
          //bottom
          // this.reset("Giữ cho khuôn mặt ở chính giữa và cách màn hình khoảng 25cm");
        } else if (probability < 0.999) {
          this.reset("Giữ cho khuôn mặt không bị che chắn và cách màn hình khoảng 25cm");
        } else {
          this._message.innerHTML = "Thực hiện thành công";
          cameras._confirm.style = "display:block";

          const loadFileToDocument = async function () {
            const response = await fetch(cameras._mediaRecorded.src);
            const blob = await response.blob();
            const fileName = cameras.generateUUID();

            const file = new File([blob], `${fileName}.jpg`, {
              type: "image/jpeg",
              lastModified: new Date(),
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            cameras._faceRecord.files = dataTransfer.files;
          };

          loadFileToDocument();
        }
      }
    } catch (error) {
      // cameras.reset();
      console.log("error while draw prediction: ", error);
      cameras._message.textContent = error.toString();
    }
  },
  generateUUID: function () {
    var d = new Date().getTime();
    var d2 = (typeof performance !== "undefined" && performance.now && performance.now() * 1000) || 0;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16;
      if (d > 0) {
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  },
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
  reset: function (message = "") {
    cameras._message.textContent = message;
    cameras.faceVerify = false;

    this._confirm.style = "display:none";
  },
};
