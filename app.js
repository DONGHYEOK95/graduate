var express=require('express'); //express=nodejs서버를 구동시키기위한 명령
var app=express(); //app을 통해 express서버를 구동 app=서버
var fs = require('fs');
var bodyparser=require('body-parser'); //스트링을 데이터로 파싱
var markets = require('./market.js')();

app.use('/images', express.static('images'));
app.use(bodyparser.json()); // 바디파서로 파싱해서 쓰겟다, 스트링데이터를 쓰겟다

app.listen(8080, function(){ // node app.js 8080포트(임시)를 통해 서버 통신하겠다.
  console.log('server is running');
  console.log(markets[0]);
});

app.get('/keyboard', function(req, res) { //데이터를 받는 양식 http메소드
  var keyboard={
    "type": "buttons",
    "buttons": [
      "1. 매장선택",
      "2. 메뉴선택",
      "3, 주문하기",
      "4. 주문확인"
    ]
  };

  res.send(keyboard);
});

function jsonToString() {
  var result = '';
  var i = 0;

  for (i=0;i<markets.length;i++) {
    result += (i+1) + '. ' + markets[i].market_name + '\n(' + markets[i].market_tel + ')\n';
  }

  return result;
}

app.post('/message', function(req, res) {
  var user_key = decodeURIComponent(req.body.user_key);
  var type = decodeURIComponent(req.body.type);
  var content = decodeURIComponent(req.body.content);

  var answer = {};

  if (content == "1. 매장선택") {
    answer = {
      "message" : {
        "photo": {
          "url": "http://54.180.82.68:8080/images/img_1.jpg",
          "width": 640,
          "height": 480
        },
        "text": "[매장을 선택해 주세요]\n\n"+jsonToString(),
        "keyboard": {
          "type": "text"
        }
      }
    };
  } else if (content == "2. 메뉴선택") {

  } else if (content == "3. 주문하기") {

  } else if (content == "4. 주문확인") {

  } else {
    answer = {
      "message" : {
        "text": "[메뉴를 선택해 주세요]",
        "keyboard": {
          "type": "buttons",
          "buttons": [
            "1. 매장선택",
            "2. 메뉴선택",
            "3, 주문하기",
            "4. 주문확인"
          ]
        }
      }
    };
  }

  res.send(answer);
});
