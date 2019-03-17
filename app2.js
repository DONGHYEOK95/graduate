var express=require('express'); //express=nodejs서버를 구동시키기위한 명령
var app=express(); //app을 통해 express서버를 구동 app=서버
var fs = require('fs');
var bodyparser=require('body-parser'); //스트링을 데이터로 파싱
var markets = require('./market.js')();
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
      "1. 매장선택",
      "2. 메뉴선택",
      "3. 주문하기",
      "4. 주문확인"
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

var current_state = 0;
var answer1 = [
  [ '맥주', 'NNG', '일반 명사'],
  [ '2', 'SN', '숫자'],
  [ '개', 'NNBC', '의존 명사'],
  [ '추가', 'NNG', '일반 명사']
];

var answer2 = [
  [ '맥주', 'NNG', '일반 명사'],
  [ '1', 'SN', '숫자'],
  [ '개', 'NNBC', '의존 명사'],
  [ '빼', 'VV', '동사'],
  [ '줘', 'EC+VV+EC' ]
];

var answer3 = [
  [ '젓가락', 'NNG', '일반 명사'],
  [ '많이', 'MAG', '일반 부사'],
  [ '줘', 'VV+EC', '동사+연결 어미']
];

var answer4 = [
  [ '콜라', 'NNG', '일반 명사'],
  [ '추가', 'NNG', '일반 명사'],
  [ '해', 'XSV+EC', '동사 파생 접미사+연결 어미'],
  [ '줘', 'VX+EC', '보조 용언+연결 어미']
];

var answer5 = [
  [ '후라이드', 'NNP', '고유 명사'],
  [ '치킨', 'NNG', '일반 명사']
]

app.post('/message', function(req, res) {
  var user_key = decodeURIComponent(req.body.user_key);
  var type = decodeURIComponent(req.body.type);
  var content = decodeURIComponent(req.body.content);

  if(current_state == 0) {
      current_state = 1;
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
      res.send(answer);
  } else if (current_state == 1) {
    // 피나치공
    current_state = 2;
    answer = {
      "message" : {
        "photo": {
          "url": "http://54.180.82.68:8080/images/menus.jpg",
          "width": 620,
          "height": 519
        },
        "text": "※ 메뉴를 선택해 주세요!\n\n",
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if (current_state == 2) {
    // 피나치공
    current_state = 3;
    var market = {
      pinachigong: {
    };
    var order = {
      coke: 1
    };

    market[user_key]['coke'] = 1;

    answer = {
      "message" : {
        "text": "형태소 분석 결과 : " + answer5 + '\n의미분석 결과 : order('+order+')\n result order\nmarket:' + market,
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if (current_state == 3) {
  } else if (current_state == 4) {
  } else if (current_state == 5) {
  } else if (current_state == 6) {
  } else if (current_state == 7) {
  }

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
