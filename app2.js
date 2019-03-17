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
];

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
    // 후라이드 치킨
    current_state = 3;
    var market = {
      pinachigong: {
      }
    };
    var order = {
      friedChicken: 1
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1
      },
      userData:{

      }
    };

    answer = {
      "message" : {
        "text": "※형태소 분석 결과 : " + beautyJSON(answer5) + '\n\n※의미분석 결과 : order('+beautyJSON(order)+')\n\n※result order\nmarket:' + beautyJSON(market),
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if (current_state == 3) {
      // 콜라 추가해줘
      current_state = 4;
      var market = {
        pinachigong: {
        }
      };
      var order = {
        coke: 1
      };

      market.pinachigong[user_key] = {
        orders:{
          friedChicken: 1,
          coke: 1
        },
        userData:{

        }
      };

      answer = {
        "message" : {
          "text": "※형태소 분석 결과 : " + beautyJSON(answer4) + '\n\n※의미분석 결과 : order('+beautyJSON(order)+')\n\n※result order\nmarket:' + beautyJSON(market),
          "keyboard": {
            "type": "text"
          }
        }
      };
      res.send(answer);
  } else if (current_state == 4) {
    // 젓가락 많이줘
    current_state = 5;
    var market = {
      pinachigong: {
      }
    };
    var order = {
      coke: 1
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1,
        coke: 1
      },
      userData:{

      }
    };

    answer = {
      "message" : {
        "text": "※형태소 분석 결과 : " + beautyJSON(answer3) + '\n\n※의미분석 결과 : 의미를 분석하지 못하였습니다.\n\n※result order\nmarket:' + beautyJSON(market),
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if (current_state == 5) {
    // 카스 두개 추가해
    current_state = 6;
    var market = {
      pinachigong: {
      }
    };
    var order = {
      cass: 2
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1,
        coke: 1,
        cass: 2
      },
      userData:{

      }
    };

    answer = {
      "message" : {
        "text": "※형태소 분석 결과 : " + beautyJSON(answer2) + '\n\n※의미분석 결과 : order('+beautyJSON(order)+')\n\n※result order\nmarket:' + beautyJSON(market),
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if (current_state == 6) {
    // 맥주 한개 빼줘
    current_state = 7;
    var market = {
      pinachigong: {
      }
    };
    var order = {
      cass: -1
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1,
        coke: 1,
        cass: 1
      },
      userData:{

      }
    };

    answer = {
      "message" : {
        "text": "※형태소 분석 결과 : " + beautyJSON(answer1) + '\n\n※의미분석 결과 : order('+beautyJSON(order)+')\n\n※result order\nmarket:' + beautyJSON(market),
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if (current_state == 7) {
    // 주문하기
    current_state = 8;
    var market = {
      pinachigong: {
      }
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1,
        coke: 1,
        cass: 1
      },
      userData:{

      }
    };

    answer = {
      "message" : {
        "text": "※메뉴를 확인하시고 번호와, 위치를 적어주세요. \n\n※result order\nmarket:'" + beautyJSON(market),
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if (current_state == 8) {
    // 번호는 01031928053이고 위치는 멀티관 502호로 가져다줘
    current_state = 9;
    var market = {
      pinachigong: {
      }
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1,
        coke: 1,
        cass: 1
      },
      userData:{
        phone: '010-2084-7405',
        location: '멀티관 502'
      }
    };
    var setData = {
    }
    setData[user_key].phone = '01020847405';
    setData[user_key].location = '멀티관 502';

    answer = {
      "message" : {
        "text": "※의미분석 결과 : setData("+beautyJSON(setData)+")\n※result order\nmarket:" + beautyJSON(market) + '\n위의 정보가 맞으시면 주문 완료라고 말해주세요.',
        "keyboard": {
          "type": "text"
        }
      }
    };
    res.send(answer);
  } else if(current_state == 9) {
    // 번호는 01031928053이고 위치는 멀티관 502호로 가져다줘
    current_state = 10;
    var market = {
      pinachigong: {
      }
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1,
        coke: 1,
        cass: 1
      },
      userData:{
        phone: '010-2084-7405',
        location: '멀티관 502'
      }
    };

    answer = {
      "message" : {
        "text": "※주문이 완료 되었습니다. \n※result order\nmarket:" + beautyJSON(market),
        "keyboard": {
          "type": "buttons",
          "buttons": [
            "1. 매장선택",
            "2. 메뉴선택",
            "3. 주문하기",
            "4. 주문확인"
          ]
        }
      }
    };
    res.send(answer);
  } else {
    var market = {
      pinachigong: {
      }
    };

    market.pinachigong[user_key] = {
      orders:{
        friedChicken: 1,
        coke: 1,
        cass: 1
      },
      userData:{
        phone: '010-2084-7405',
        location: '멀티관 502'
      },
      status: 'wait'
    };

    answer = {
      "message" : {
        "text": "※주문현황 :" + beautyJSON(market),
        "keyboard": {
          "type": "buttons",
          "buttons": [
            "1. 매장선택",
            "2. 메뉴선택",
            "3. 주문하기",
            "4. 주문확인"
          ]
        }
      }
    };
    res.send(answer);
  }
});
