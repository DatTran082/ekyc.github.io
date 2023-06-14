// import "../landmarkModel/cdn.net_npm_@tensorflow_tfjs-core";
// import "../landmarkModel/cdn.net_npm_@tensorflow_tfjs-backend-webgl";
// import "../landmarkModel/cdn.net_npm_@mediapipe_face_mesh";
// import * as faceLandmarksDetection from "../landmarkModel/cdn.net_npm_@tensorflow-models_face-landmarks-detection";

// import * as faceLandmarksDetection from "./@tensorflow-models/face-landmarks-detection";

import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "@tensorflow/tfjs-core";
// Register WebGL backend.
import "@tensorflow/tfjs-backend-webgl";
import "@mediapipe/face_mesh";

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

    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;

    const detectorConfig = {
      runtime: "tfjs",
    };

    cameras.model = await faceLandmarksDetection.createDetector(model, {
      runtime: "tfjs",
    });

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
        this._timer.textContent = "chỉ cho phép 1 khuôn mặt trong khung hình";
      } else if (prediction[0].landmarks.length == 6) {
        cameras.start();
      } else {
        cameras.reset();
        this._timer.textContent = "vui lòng giữ khuôn mặt trong khung hình";
      }
    } catch (error) {
      cameras.reset();
      this._timer.textContent = "vui lòng giữ khuôn mặt trong khung hình";
    }
    // cameras.canvas.width = cameras.videoLive.width;
    // cameras.canvas.height = cameras.videoLive.height;
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
    const estimationConfig = { flipHorizontal: false };

    const prediction = await cameras.model.estimateFaces(
      this.videoLive,
      estimationConfig
    );

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
    cameras.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    cameras.faceVerify = true;
  },
};

cameras.init();

const tempthorixone = [
  {
    topLeft: {
      kept: false,
      isDisposedInternal: false,
      shape: [2],
      dtype: "float32",
      size: 2,
      strides: [],
      dataId: {
        id: 2809,
      },
      id: 2529,
      rankType: "1",
      scopeId: 4604,
    },
    bottomRight: {
      kept: false,
      isDisposedInternal: false,
      shape: [2],
      dtype: "float32",
      size: 2,
      strides: [],
      dataId: {
        id: 2810,
      },
      id: 2530,
      rankType: "1",
      scopeId: 4605,
    },
    landmarks: {
      kept: false,
      isDisposedInternal: false,
      shape: [6, 2],
      dtype: "float32",
      size: 12,
      strides: [2],
      dataId: {
        id: 2812,
      },
      id: 2532,
      rankType: "2",
      scopeId: 4607,
    },
    probability: {
      kept: false,
      isDisposedInternal: false,
      shape: [1],
      dtype: "float32",
      size: 1,
      strides: [],
      dataId: {
        id: 2803,
      },
      id: 2522,
      rankType: "1",
      scopeId: 4586,
    },
  },
];

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
