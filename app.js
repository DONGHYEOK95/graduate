var express=require('express'); //express=nodejs서버를 구동시키기위한 명령
var app=express(); //app을 통해 express서버를 구동 app=서버
var fs = require('fs');
var bodyparser=require('body-parser'); //스트링을 데이터로 파싱
var mecab = require('mecab-ya'); //형태소 분석기 라이브러리.

app.use('/images', express.static('images'));
app.use(bodyparser.json()); // 바디파서로 파싱해서 쓰겟다, 스트링데이터를 쓰겟다

app.listen(8080, function(){ // node app.js 8080포트(임시)를 통해 서버 통신하겠다.
  console.log('server is running');
});

app.get('/keyboard', function(req, res) { //데이터를 받는 양식 http메소드
  var keyboard={
    "type": "buttons",
    "buttons": [
      "1. 매뉴 주문하기",
      "2. 사이드 주문하기",
      "3. 주문 완료"
    ]
  };

  res.send(keyboard);
});

function jsonToString() {
  var result = '';
  var i = 0;

  for (i=0;i<markets.length;i++) {
    result += (i+1) + '. ' + markets[i].market_name + ' (' + markets[i].market_tel + ')\n';
  }

  return result;
}


function beautyJSON(json) {
  var text = JSON.stringify(json);
  var jsonPretty
  try{
    jsonPretty = JSON.stringify(JSON.parse(text),null,2);
  }catch (e) {
    return console.log(e);
  }
  return jsonPretty;
}

app.post('/message', function(req, res) {
  var user_key = decodeURIComponent(req.body.user_key);
  var type = decodeURIComponent(req.body.type);
  var content = decodeURIComponent(req.body.content);

  answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/img_1.jpg",
        "width": 640,
        "height": 425
      },
      "text": "※ 매장을 선택해 주세요!\n\n"+jsonToString(),
      "keyboard": {
        "type": "text"
      }
    }
  };
  console.log("------------------------------------------------------------------------");
  console.log('USER_LOGIN : ', user_key);
  res.send(answer);


  mecab.pos(content, function(err,result) {
    answer = {
      "message" : {
        "text": "※ 형태소 분석 결과\n" + result.toString(),
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  });
});
