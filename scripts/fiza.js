var canvas1 = document.getElementById("canvas1");
var canvas2 = document.getElementById("canvas2");
var image1 = new MarvinImage();
var image2 = new MarvinImage();
//https://cdn.fastmoneyevnfc.com/Fastmoney/Images/20231206/23cc70a7eca1552f278d47f38cdbc2b2.png
image1.load("https://cdn.fastmoneyevnfc.com/Fastmoney/Images/20231206/564e944f97d432550dd92a33c0dd33c5.png", image1Loaded);
image2.load("https://cdn.fastmoneyevnfc.com/Fastmoney/Images/20231206/472a047006f05a3602260af7f5e581c5.png", image2Loaded);

function image1Loaded() {
  processImage(image1, canvas1);
}
function image2Loaded() {
  processImage(image2, canvas2);
}

function processImage(image, canvas) {
  var bbox = boundingBox(image);
  image.drawRect(bbox[0] - 10, bbox[1] - 10, bbox[2] - bbox[0] + 20, bbox[3] - bbox[1] + 20, 0xffff0000);
  image.draw(canvas);
}

function boundingBox(image) {
  var x1 = 9999,
    x2 = -1,
    y1 = 9999,
    y2 = -1;
  var img = image.clone();
  Marvin.thresholding(img, img, 127);
  for (var y = 0; y < img.getHeight(); y++) {
    for (var x = 0; x < img.getWidth(); x++) {
      // Is Black (Object)?
      if (img.getIntColor(x, y) == 0xff000000) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
      }
    }
  }
  return [x1, y1, x2, y2];
}
