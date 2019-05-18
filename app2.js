var express=require('express'); //express=nodejs서버를 구동시키기위한 명령
var app=express(); //app을 통해 express서버를 구동 app=서버
var fs = require('fs');
var bodyparser=require('body-parser'); //스트링을 데이터로 파싱
var mecab = require('mecab-ffi'); //형태소 분석기 라이브러리.
var mysql      = require('sync-mysql');
var connection = new mysql({
  host     : 'ec2-54-180-82-68.ap-northeast-2.compute.amazonaws.com',
  user     : 'root',
  password : '1234',
  database : 'graduate'
});

var user = {};

var MEAN = {
  ORDER: 1,
  DONE: 2,
  DELETE: 3
};

var COMMAND = {
  order: MEAN.ORDER,
  done: MEAN.DONE,
  delete: MEAN.DELETE
};

var STATUS = {
  MAIN_MENU: 0,
  PRIVATE_INFO_AGREE_FLOW: 1,
  ORDER_MAIN_MENU: 2,
  ORDER_SIDE_MENU: 3,
  MAIN_MENU_SELECT_DONE: 4,
  SIDE_MENU_SELECT_DONE: 5,
  ORDER_DONE: 6,
  ORDER_HOTDOG: 7,
  ORDER_BURRITO: 8,
  SELECT_BURRITO_SPICY: 9,
  SELECT_HOTDOG_SPICY: 10,
  ADD_BURRITO_TOPPING: 11
};

app.use('/images', express.static('images'));
app.use(bodyparser.json()); // 바디파서로 파싱해서 쓰겟다, 스트링데이터를 쓰겟다

app.listen(8080, function(){ // node app.js 8080포트(임시)를 통해 서버 통신하겠다.
  console.log('server is running');
});

app.get('/keyboard', function(req, res) { //데이터를 받는 양식 http메소드
  res.send(
  {
    "type": "buttons",
    "buttons": [
      "주문시작"
    ]
  });
});

app.post('/message', function(req, res) {
  var user_key = decodeURIComponent(req.body.user_key);
  var type = decodeURIComponent(req.body.type);
  var content = decodeURIComponent(req.body.content);

  var sentence = textToSentence(content);
  var count = connection.query(`SELECT * FROM count`)[0].question;

  var isAgree = connection.query(`SELECT * FROM user WHERE userKey='${user_key}'`);

  if (isAgree[0] && !user[user_key]) {
    initUser(user_key);
    mainMenu(res);
  } else if (!isAgree[0] && user[user_key] && user[user_key].status == STATUS.PRIVATE_INFO_AGREE_FLOW) {
    var info = privateInfo(content);
    connection.query(`INSERT INTO user VALUES ('${user_key}', '${info.name}', '${info.phone}', 'true')`);
    initUser(user_key);
    mainMenu(res);
  } else if (!isAgree[0] || isAgree && isAgree[0] && isAgree[0].agree !== 'true') {
    if (content == '개인정보 이용 동의') {
      agree(user_key, res);
    } else {
      agreePrivateInfoUse(res);
    }
  } else if(user[user_key].status == STATUS.MAIN_MENU) {
    if (content == "1. 메뉴 주문하기") {
      user[user_key].status = STATUS.ORDER_MAIN_MENU;
      // 핫도그들과 브리또들중 골라주세여
      user[user_key].lastMenu = {
        main: '',
        spicy: '',
        detail: '',
        topping: []
      };
      selectMainMenu(res);
    } else if (content == "2. 사이드 주문하기") {
      user[user_key].status = STATUS.ORDER_SIDE_MENU;
      testMessage(res, '사이드 주문하기');
    } else if (content == "3. 메뉴선택완료") {
      user[user_key].status = STATUS.ORDER_DONE;
      testMessage(res, '메뉴선택완료');
    }
  } else if(user[user_key].status == STATUS.ORDER_MAIN_MENU) {
    if (content == "핫도그 (Hotdog)") {
      user[user_key].status = STATUS.SELECT_HOTDOG_SPICY;
      user[user_key].lastMenu.main = '핫도그 (Hotdog)';
      selectSpicy(res);
    } else {
      user[user_key].status = STATUS.SELECT_BURRITO_SPICY;
      user[user_key].lastMenu.main = '브리또(Burrrito)';
      selectSpicy(res);
    }
  } else if(user[user_key].status == STATUS.SELECT_HOTDOG_SPICY) {
    // 메뉴 추가.
    user[user_key].lastMenu.spicy = content;
    console.log(user[user_key].lastMenu);
    testMessage(res, '디테일한 핫도그를 설정해 주세요.');
    user[user_key].status = STATUS.ORDER_HOTDOG;
  } else if(user[user_key].status == STATUS.ORDER_HOTDOG) {
    var hotdogs = connection.query(`SELECT * FROM menus WHERE type='hotdog'`);
    var menus = getMenus(hotdogs);
    var selectedMenu = findSentence(sentence,menus);
    var selectedHotdog = connection.query(`SELECT * FROM hotdog WHERE id=${selectedMenu.index}`);
    selectedHotdog = selectedHotdog[0]?selectedHotdog[0]:null;

    user[user_key].lastMenu.detail = selectedHotdog.name;
    console.log(user[user_key].lastMenu);
    testMessage(res, selectedHotdog.name + '메뉴가 추가되었습니다.' + selectedHotdog.price + '원');
    user[user_key].status = STATUS.MAIN_MENU;
  } else if(user[user_key].status == STATUS.SELECT_BURRITO_SPICY) {
    // 메뉴 추가.
    user[user_key].lastMenu.spicy = content;
    console.log(user[user_key].lastMenu);
    testMessage(res, '디테일한 브리또를 설정해 주세요.');
    user[user_key].status = STATUS.ORDER_BURRITO;
  } else if(user[user_key].status == STATUS.ORDER_BURRITO) {
    var burritos = connection.query(`SELECT * FROM menus WHERE type='burrito'`);
    var menus = getMenus(burritos);
    var selectedMenu = findSentence(sentence,menus);
    var selectedBurrito = connection.query(`SELECT * FROM burrito WHERE id=${selectedMenu.index}`);
    selectedBurrito = selectedBurrito[0]?selectedBurrito[0]:null;

    user[user_key].lastMenu.detail = selectedBurrito.name;
    console.log(user[user_key].lastMenu);
    testMessage(res, selectedBurrito.name + '메뉴가 추가되었습니다.' + selectedBurrito.price + '원');
    user[user_key].status = STATUS.ADD_BURRITO_TOPPING;
  } else if(user[user_key].status == STATUS.ADD_BURRITO_TOPPING) {
    // 의도분석.
    if (false) {
      // 선택이 완료되었습니다.
      user[user_key].menus.push(user[user_key].lastMenu);
      user[user_key].status = STATUS.MAIN_MENU;
        testMessage(res, '메뉴가 추가되었습니다.');
    } else if (false) {
      // 토핑을 찾는다.
      // 토핑제거
      user[user_key].topping.push("topping");
      // 토핑 추가가 되었습니다. 더 추가를 원하시면 추가, 싫으면 꺼라.
      user[user_key].status = STATUS.ADD_BURRITO_TOPPING;
      testMessage(res, '토핑 제거');
    } else {
      // 토핑을 찾는다.
      // 토핑추가.
      user[user_key].topping.push("topping");
      // 토핑 추가가 되었습니다. 더 추가를 원하시면 추가, 싫으면 꺼라.
      user[user_key].status = STATUS.ADD_BURRITO_TOPPING;
      testMessage(res, '토핑 추가');
    }
  } else if(user[user_key].status == STATUS.ORDER_SIDE_MENU) {
    testMessage(res, 'ORDER_SIDE_MENU');
  } else if(user[user_key].status == STATUS.ORDER_DONE) {
    testMessage(res, 'ORDER_DONE');
  }
});

function testMessage(res, text) {
  var answer = {
    "message" : {
      "text": text,
    },
    "keyboard": {
      "type": "text"
    }
  };

  res.send(answer);
}

function getMenus(menus) {
  var result = [];

  for(var i=0;i<menus.length;i++) {
    var menuRow = menus[i];
    var sentence = [];

    for(var j=0;j<menuRow.length;j++) {
      sentence.push(menuRow.name);
    }

    result.push(sentence);
  }

  return result;
}

function privateInfo(content) {
  var result = content.split('\n');

  return {
    name: result[0]?result[0]:'',
    phone: result[1]?result[1]:''
  };
}

function selectSpicy(res) {
  var answer = {
    "message" : {
      "text": "소스를 선택해 주세요.",
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "#안매운맛",
        "#중간맛",
        "#매운맛"
      ]
    }
  };

  res.send(answer);
}

function selectMainMenu(res) {
  var answer = {
    "message" : {
      "text": "메뉴를 선택해 주세요.",
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "핫도그 (Hotdog)",
        "브리또 (Burrito)",
      ]
    }
  };

  res.send(answer);
}

function agree(user_key, res) {
    initUser(user_key);
    user[user_key].status = STATUS.PRIVATE_INFO_AGREE_FLOW;

    var concept = "이름 : \n전화번호 : ";
    var answer = {
      "message" : {
        "text": "정보 제공에 동의하셨습니다.\n다음 양식에 맞추어 내용을 입력해 주세요.\n\n" + concept,
      },
      "keyboard": {
        "type": "text"
      }
    };

    res.send(answer);
}

function mainMenu(res) {
  var answer = {
    "message" : {
      "text": "메뉴를 선택해 주세요.",
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "1. 메뉴 주문하기",
        "2. 사이드 주문하기",
        "3. 메뉴선택완료"
      ]
    }
  };

  res.send(answer);
}

function agreePrivateInfoUse(res) {
  var answer = {
    "message" : {
      "text": "사용을 위한 개인정보 동의가 필요합니다."
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "개인정보 이용 동의",
        "취소",
      ]
    }
  };

  res.send(answer);
}

function initUser(user_key) {
  if (!user[user_key]) {
    user[user_key] = {
      status: STATUS.MAIN_MENU,
      menus: [
      ]
    }
  }
}

function orderflow(text) {
  var sentence = textToSentence(text);
  if (!isDone(sentence)) {
    return {
      menu: menuExtractor(sentence),
      mean: MEAN.ORDER
    };
  } else {
    return {
      menu: null,
      mean: MEAN.DONE
    }
  }
}

function menuExtractor(sentence) {
  // 메뉴 유사 텍스트 처리
  let menu = MENU.HOTDOG;
  // 여기가 좀 빡세네.. 문장에서 메뉴, 갯수를 추출해야 한다.

  return {
    menu: 1,
    ea: 1,
    success: true | false
  };
}

function isDone(sentence) {
  // 텍스트 의미분석
  // var doneSentences = DB조회로 가져온다.;
  var doneSentences = [["주문", "그만"], ["그만"], ["끝"],["메뉴", "끝"]];

  var simillarSentence = findSentence(sentence, doneSentences);

  if (simillarSentence.simillarity > 0.4) {
    return true;
  } else {
    return false;
  }
}

function textToSentence(content) {
  var sentence = [];

  var result = mecab.parseSync(content);

  for (var i=0; i<result.length; i++) {
    sentence.push(result[i][0]);
  }

  return sentence;
}

// word = "문자"
// [word, word] = sentence
// [sentence, sentence] = sentences
// sentence = ["체다", "치즈", "추가", "해줘"];
// sentences = [["체다", "치즈", "추가", "해줘"], ["마늘", "추가"]];
function findSentence(sentence, sentences) {
  var index = -1;
  var maxSimillarity = 0;

  for (var i=0; i<sentences.length; i++) {
    var compareSentence = [].concat(sentences[i]);
    var union = sentence.length + compareSentence.length;
    var intersection = 0;

    // 비교하길 원하던 문장 유사도를 측정해보자.
    for (var j=0; j<sentence.length; j++) {
      var result = findWord(sentence[j], compareSentence).index;

      if (result !== -1) {
        compareSentence.splice(result, 1);
        intersection += 1;
        union -= 1;
      }
    }

    var simillarity = intersection / union;

    if (index == -1 || simillarity > maxSimillarity) {
      index = i;
      maxSimillarity = simillarity;
    }
  }

  return {
    index: index,
    simillarity: maxSimillarity
  };
}

function findWord(word, sentence) {
  var index = -1;

  for (var i=0; i<sentence.length; i++) {
    if (word == sentence[i]) {
      index = i;
    }
  }

  return {
    index: index
  };
}

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
