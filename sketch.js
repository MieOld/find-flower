let handPose;
let video;
let hands = [];
let frameImg; // PNG 框架图片

function preload() {
  // 加载 ml5.js 的 handPose 模型（注意大写 P）
  handPose = ml5.handPose();
  // 加载 PNG 图片，请确保 frame.png 在项目目录中
  frameImg = loadImage("frame.png");
}

function setup() {
  // 使用手机屏幕尺寸作为画布大小
  createCanvas(windowWidth, windowHeight);
  frameRate(15);
  
  // 使用后置摄像头，视频分辨率设为 640x480（较清晰）
  let constraints = {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  };
  video = createCapture(constraints);
  video.hide();
  
  // 开始检测手部
  handPose.detectStart(video, gotHands);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function gotHands(results) {
  hands = results;
}

// 返回一只手中大拇指尖（索引4）与食指尖（索引8）之间距离的一半（基于视频坐标）
function getHandRadius(hand) {
  let thumbTip = hand.keypoints[4];
  let indexTip = hand.keypoints[8];
  return dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y) / 2;
}

function draw() {
  background(255);
  
  // 计算视频绘制区域，保持 640×480 原始宽高比
  let videoAspect = video.width / video.height;
  let canvasAspect = width / height;
  let drawX, drawY, drawW, drawH;
  if (canvasAspect > videoAspect) {
    // 画布较宽时：视频填满高度
    drawH = height;
    drawW = height * videoAspect;
    drawX = (width - drawW) / 2;
    drawY = 0;
  } else {
    // 画布较窄时：视频填满宽度
    drawW = width;
    drawH = width / videoAspect;
    drawX = 0;
    drawY = (height - drawH) / 2;
  }
  
  // 绘制视频（保持正确比例）
  image(video, drawX, drawY, drawW, drawH);

  if (hands.length > 0) {
    let hand = hands[0];
    let thumbTip = hand.keypoints[4];
    let indexTip = hand.keypoints[8];
    
    // 计算视频到画布的缩放因子
    let scaleX = drawW / video.width;
    let scaleY = drawH / video.height;
    
    // 转换手指坐标到画布坐标（加上绘制区域偏移量）
    let thumbX = thumbTip.x * scaleX + drawX;
    let thumbY = thumbTip.y * scaleY + drawY;
    let indexX = indexTip.x * scaleX + drawX;
    let indexY = indexTip.y * scaleY + drawY;
    
    // 以大拇指与食指之间的距离计算一个基础半径（视频坐标下的一半），并转换到画布坐标
    let rawRadius = getHandRadius(hand);
    let scaledRadius = ((rawRadius * scaleX) + (rawRadius * scaleY)) / 2 * 0.8;
    
    // ---------------------------
    // 绘制两个花型蒙版，分别在大拇指和食指位置
    // ---------------------------
    push();
      let ctx = drawingContext;
      ctx.beginPath();
      // 绘制整个画布作为外部路径
      ctx.rect(0, 0, width, height);
      
      // 参数设置：花瓣数与振幅
      let petals = 5;
      let amplitude = 0.2;
      
      // 绘制大拇指处的花形路径
      for (let angle = 0; angle <= TWO_PI; angle += 0.01) {
        let r = scaledRadius * (1 + amplitude * cos(petals * angle));
        let x = thumbX + r * cos(angle);
        let y = thumbY + r * sin(angle);
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // 绘制食指处的花形路径
      for (let angle = 0; angle <= TWO_PI; angle += 0.02) {
        let r = scaledRadius * (1 + amplitude * cos(petals * angle));
        let x = indexX + r * cos(angle);
        let y = indexY + r * sin(angle);
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      // 使用 "evenodd" 填充规则扣除两个花形区域
      ctx.fill("evenodd");
    pop();
    
    // 可选：绘制花型边框（调试或装饰用）
    push();
      noFill();
      stroke("#6CD5FF"); // 设置边框颜色为字体的蓝色
      strokeWeight(2);
      // 绘制大拇指花形边框
      beginShape();
      for (let angle = 0; angle <= TWO_PI; angle += 0.01) {
        let r = scaledRadius * (1 + amplitude * cos(petals * angle));
        let x = thumbX + r * cos(angle);
        let y = thumbY + r * sin(angle);
        vertex(x, y);
      }
      endShape(CLOSE);
      // 绘制食指花形边框
      beginShape();
      for (let angle = 0; angle <= TWO_PI; angle += 0.01) {
        let r = scaledRadius * (1 + amplitude * cos(petals * angle));
        let x = indexX + r * cos(angle);
        let y = indexY + r * sin(angle);
        vertex(x, y);
      }
      endShape(CLOSE);
    pop();
    
    // ---------------------------
    // 绘制单个 PNG 框架图：中心定位于大拇指与食指中点
    // ---------------------------
    let pngCenterX = (thumbX + indexX) / 2;
    let pngCenterY = (thumbY + indexY) / 2; // 向上偏移半径的距离
    let scaleFactor = 4;
    let frameSize = scaledRadius * 2 * scaleFactor;

    push();
      resetMatrix(); // 恢复默认变换，确保 PNG 框架位置正确
      image(frameImg, pngCenterX - frameSize / 2, pngCenterY - frameSize / 2, frameSize, frameSize);
    pop();
  }

  // 绘制UI文字部分
  // 左上角 "Seeking Spring"
  fill("#FFFFFF");
  noStroke();
  textSize(54);
  textAlign(LEFT, TOP);
  textFont('Times New Roman'); // 英文字体（衬线字体）
  text("Seeking Flower", 80, 230);
  
  // 左上角 "双指之间，春日可见"
  fill("#FF94C6"); // 文字颜色改为 FF94C6
  noStroke();
  textSize(36);
  textAlign(LEFT, TOP);
  textFont('Songti SC'); // 中文字体（宋体）
  text("双指之间，春日可见", 80, 310);

  // 右上角 "寻·春"
  fill("#FF94C6"); // 文字颜色改为 FF94C6
  textSize(72);
  textAlign(RIGHT, TOP);
  textFont('Songti SC'); // 中文字体（宋体）
  text("寻·花", width - 80, 250);

  // 左下角 "march 2025"
  fill("#FF94C6"); // 文字颜色改为 FF94C6
  textSize(36);
  textAlign(LEFT, BOTTOM);
  textFont('Times New Roman'); // 英文字体（衬线字体）
  text("March 2025", 80, height - 250);

  // 右下角 "By MieOld"
  fill("#FFFFFF");
  textSize(36);
  textAlign(RIGHT, BOTTOM);
  textFont('Times New Roman'); // 英文字体（衬线字体）
  text("By MieOld", width - 80, height - 250);

  // 在没有手时显示文本
  if (hands.length === 0) {
    fill("#FF94C6"); // 文字颜色改为 FF94C6
    textSize(54);
    textAlign(CENTER, CENTER);
    textFont('Songti SC'); // 中文字体（宋体）
    text("请  寻  找  春  天", width / 2 , height * 0.6);
    textSize(24);
    textFont('Arial'); // 中文字体（无衬线字体）
    fill("#FFFFFF");
    text("尝试用两指靠近或拉开，发现更多春日美景。", width / 2, height * 0.7);
  }
}
