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
  ORDER: 'order',
  DONE: 'done',
  DELETE: 'delete'
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
  ADD_BURRITO_TOPPING: 11,
  VIEW_ORDER: 12
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
    mainMenu(res,getStringMenu(user_key));
  } else if (!isAgree[0] && user[user_key] && user[user_key].status == STATUS.PRIVATE_INFO_AGREE_FLOW) {
    var info = privateInfo(content);
    connection.query(`INSERT INTO user VALUES ('${user_key}', '${info.name}', '${info.phone}', 'true')`);
    delete user[user_key];
    initUser(user_key);
    mainMenu(res,getStringMenu(user_key));
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
        topping: [],
        price: 0
      };
      selectMainMenu(res);
    } else if (content == "2. 사이드 주문하기") {
      user[user_key].status = STATUS.ORDER_SIDE_MENU;
      sideMessage(res, '사이드 주문하기');
    } else if (content == "3. 메뉴 선택완료") {
      user[user_key].status = STATUS.ORDER_DONE;
      testMessage(res, '※ 주소와 결제방법을 입력해 주세요.\nex) 주소 : 멀티 M515\n결제방법 : 카드');
    } else if (content == "4. 주문 현황 확인") {
      user[user_key].status = STATUS.VIEW_ORDER;
      var currentOrder = connection.query(`SELECT * FROM orders WHERE user_key='${user_key}'`);
      if (currentOrder.length > 0) {
        currentOrder = currentOrder[currentOrder.length-1].order.replace(/(enter)/g, '\n');
      } else {
        currentOrder = ''
      }
      viewOrderMessage(res, currentOrder);
    }
  } else if(user[user_key].status == STATUS.VIEW_ORDER) {
    if (content == "확인") {
      user[user_key].status == STATUS.MAIN_MENU;
      mainMenu(res);
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
    hotdogDetailMessage(res);
    user[user_key].status = STATUS.ORDER_HOTDOG;
  } else if(user[user_key].status == STATUS.ORDER_HOTDOG) {
    var hotdogs = connection.query(`SELECT * FROM menus WHERE type='hotdog'`);
    var menus = getMenus(hotdogs);
    var selectedMenu = findSentence(sentence,menus);
    var selectedHotdog = connection.query(`SELECT * FROM hotdog WHERE id=${selectedMenu.index}`);
    selectedHotdog = selectedHotdog[0]?selectedHotdog[0]:null;

    if (selectedMenu.simillarity > 0.35) {
      user[user_key].lastMenu.detail = selectedHotdog.name;
      user[user_key].lastMenu.price += selectedHotdog.price;
      user[user_key].price += user[user_key].lastMenu.price;
      user[user_key].menus.push(user[user_key].lastMenu);
      mainMenu(res,getStringMenu(user_key));
      user[user_key].status = STATUS.MAIN_MENU;
    } else {
      hotdogDetailMessage(res, '※ 인식하지 못했습니다.');
    }
  } else if(user[user_key].status == STATUS.SELECT_BURRITO_SPICY) {
    // 메뉴 추가.
    user[user_key].lastMenu.spicy = content;
    burritoDetailMessage(res);
    user[user_key].status = STATUS.ORDER_BURRITO;
  } else if(user[user_key].status == STATUS.ORDER_BURRITO) {
    var burritos = connection.query(`SELECT * FROM menus WHERE type='burrito'`);
    var menus = getMenus(burritos);
    var selectedMenu = findSentence(sentence,menus);
    var selectedBurrito = connection.query(`SELECT * FROM burrito WHERE id=${selectedMenu.index}`);
    selectedBurrito = selectedBurrito[0]?selectedBurrito[0]:null;


    if (selectedMenu.simillarity > 0.35) {
      user[user_key].lastMenu.detail = selectedBurrito.name;
      user[user_key].lastMenu.price += selectedBurrito.price;
      toppingDetailMessage(res, getStringLastMenu(user[user_key].lastMenu));
      user[user_key].status = STATUS.ADD_BURRITO_TOPPING;
    } else {
      burritoDetailMessage(res, '※ 인식하지 못했습니다.');
    }
  } else if(user[user_key].status == STATUS.ADD_BURRITO_TOPPING) {
    var questions = connection.query(`SELECT * FROM question`);
    var answers = connection.query(`SELECT * FROM answer`);
    var menus = getQuestion(questions);
    var selectedMenu = findSentence(sentence,menus);
    var type = answers[selectedMenu.index].type;


    if (selectedMenu.simillarity < 0.35) {
      toppingDetailMessage(res, '※ 인식하지 못했습니다.');
    } else if (type == MEAN.DONE) {
      // 선택이 완료되었습니다.
      user[user_key].menus.push(user[user_key].lastMenu);
      user[user_key].price += user[user_key].lastMenu.price;
      user[user_key].status = STATUS.MAIN_MENU;
      mainMenu(res,getStringMenu(user_key));
    } else if (type == MEAN.DELETE) {
      var toppings = connection.query(`SELECT * FROM menus WHERE type='topping'`);
      var sentences = getMenus(toppings);
      var toppingSentence = findSentence(sentence,sentences);
      var selectedTopping = connection.query(`SELECT * FROM topping WHERE id=${toppingSentence.index}`);
      selectedTopping = selectedTopping[0]?selectedTopping[0]:null;

      if (user[user_key].lastMenu.topping.indexOf(selectedTopping.name)>=0) {
        user[user_key].lastMenu.topping.splice(user[user_key].lastMenu.topping.indexOf(selectedTopping.name), 1);
        user[user_key].lastMenu.price -= selectedTopping.price;
      }
      user[user_key].status = STATUS.ADD_BURRITO_TOPPING;
      toppingDetailMessage(res, getStringLastMenu(user[user_key].lastMenu));
      console.log(user[user_key].lastMenu);
    } else if(type == MEAN.ORDER) {
      var toppings = connection.query(`SELECT * FROM menus WHERE type='topping'`);
      var sentences = getMenus(toppings);
      var toppingSentence = findSentence(sentence,sentences);
      var selectedTopping = connection.query(`SELECT * FROM topping WHERE id=${toppingSentence.index}`);
      selectedTopping = selectedTopping[0]?selectedTopping[0]:null;
      console.log(sentence);

      user[user_key].lastMenu.topping.push(selectedTopping.name);
      user[user_key].lastMenu.price += selectedTopping.price;
      user[user_key].status = STATUS.ADD_BURRITO_TOPPING;
      toppingDetailMessage(res, getStringLastMenu(user[user_key].lastMenu));
      console.log(user[user_key].lastMenu);
    }
  } else if(user[user_key].status == STATUS.ORDER_SIDE_MENU) {
    var questions = connection.query(`SELECT * FROM question`);
    var answers = connection.query(`SELECT * FROM answer`);
    var menus = getQuestion(questions);
    var selectedMenu = findSentence(sentence,menus);
    var type = answers[selectedMenu.index].type;

    if (selectedMenu.simillarity < 0.35) {
      sideMessage(res, '※ 인식하지 못했습니다.');
    } else if (type == MEAN.DONE) {
      // 선택이 완료되었습니다.
      user[user_key].status = STATUS.MAIN_MENU;
      mainMenu(res,getStringMenu(user_key));
    } else if (type == MEAN.DELETE) {
      var sides = connection.query(`SELECT * FROM menus WHERE type='side'`);
      var sentences = getMenus(sides);
      var sideSentence = findSentence(sentence,sentences);
      var selectedSide = connection.query(`SELECT * FROM side WHERE id=${sideSentence.index}`);
      selectedSide = selectedSide[0]?selectedSide[0]:null;

      if (user[user_key].side.indexOf(selectedSide.name)>=0) {
        user[user_key].side.splice(user[user_key].side.indexOf(selectedSide.name), 1);
        user[user_key].price -= selectedSide.price;
      }
      user[user_key].status = STATUS.ORDER_SIDE_MENU;
      sideMessage(res, getStringMenu(user_key));
    } else if (type == MEAN.ORDER) {
      var sides = connection.query(`SELECT * FROM menus WHERE type='side'`);
      var sentences = getMenus(sides);
      var sideSentence = findSentence(sentence,sentences);
      var selectedSide = connection.query(`SELECT * FROM side WHERE id=${sideSentence.index}`);
      selectedSide = selectedSide[0]?selectedSide[0]:null;

      user[user_key].side.push(selectedSide.name);
      user[user_key].price += selectedSide.price;
      user[user_key].status = STATUS.ORDER_SIDE_MENU;
      sideMessage(res, getStringMenu(user_key));
    }
  } else if(user[user_key].status == STATUS.ORDER_DONE) {
    if (user[user_key].menus.length > 0 || user[user_key].side.length > 0) {
      var resultContent = content.split('\n');
      user[user_key].status = STATUS.MAIN_MENU;
      user[user_key].pay = resultContent[0]?resultContent:'카드';
      user[user_key].address = resultContent[1]?resultContent[1]:'전화 바랍니다';
      // 디비에 저장한다.
      var orderMenu = getStringMenuNoEnter(user_key);
      var count = connection.query('SELECT * FROM orders');
      console.log(`INSERT INTO orders VALUES ('${count}', '${user_key}', '${orderMenu}')`);
      // connection.query(`INSERT INTO orders VALUES ('${count}', '${user_key}', '${orderMenu}')`);

      delete user[user_key];
      initUser(user_key);
      orderDone(res, orderMenu);
    } else {
      user[user_key].status = STATUS.MAIN_MENU;
      orderFail(res);
    }
  }
});

function getStringLastMenu(menu) {
  var result = '';
  result += `${menu.main}\n${menu.detail}-${menu.spicy}\n`;

  if(menu.topping.length>0) {
    result += '[ ';
    menu.topping.forEach((topping, index) => {
      if(index !== menu.topping.length-1) {
        result += topping + ', ';
      } else {
        result += topping + ' ';
      }
    });
    result += ']';
  }
  result += '\n';

  return result;
}

function getStringMenuNoEnter(user_key) {
  var result = '';
  if(user[user_key]) {
    if (user[user_key].menus.length > 0) {
      result += '-------------------------enter'
      if (user[user_key].address) {
        result += '주소 : ' + user[user_key].address +'enter';
      }
      if (user[user_key].pay) {
        result += '지불방법 : ' + user[user_key].pay +'enter';
        result += '-------------------------enter'
      }
      result += '※ 주문목록enter'
      user[user_key].menus.forEach((menu, index) => {
        result += `${index+1}. ${menu.main}enter${menu.detail}-${menu.spicy}enter`;

        if(menu.topping.length>0) {
          result += '[ ';
          menu.topping.forEach((topping, index) => {
            if(index !== menu.topping.length-1) {
              result += topping + ', ';
            } else {
              result += topping + ' ';
            }
          });
          result += ']';
        }
        result += 'enter';
      });
    }

    if (user[user_key].side.length > 0) {
      result += 'enter※ 사이드메뉴enter'
      user[user_key].side.forEach((sideName, index) => {
          if(index !== user[user_key].side.length-1) {
        result += sideName + ', ';
        } else {
          result += sideName + ' ';
        }
      });
    }

    if(result !== '') {
      result += 'enter합계 : ' + user[user_key].price + '원enter';
      result += '-------------------------'
    }
  }

  return result;
}

function getStringMenu(user_key) {
  var result = '';
  if(user[user_key]) {
    if (user[user_key].menus.length > 0) {
      result += '-------------------------\n'
      if (user[user_key].address) {
        result += '주소 : ' + user[user_key].address +'\n';
      }
      if (user[user_key].pay) {
        result += '지불방법 : ' + user[user_key].pay +'\n';
        result += '-------------------------\n'
      }
      result += '※ 주문목록\n'
      user[user_key].menus.forEach((menu, index) => {
        result += `${index+1}. ${menu.main}\n${menu.detail}-${menu.spicy}\n`;

        if(menu.topping.length>0) {
          result += '[ ';
          menu.topping.forEach((topping, index) => {
            if(index !== menu.topping.length-1) {
              result += topping + ', ';
            } else {
              result += topping + ' ';
            }
          });
          result += ']';
        }
        result += '\n';
      });
    }

    if (user[user_key].side.length > 0) {
      result += '\n※ 사이드메뉴\n'
      user[user_key].side.forEach((sideName, index) => {
          if(index !== user[user_key].side.length-1) {
        result += sideName + ', ';
        } else {
          result += sideName + ' ';
        }
      });
    }

    if(result !== '') {
      result += '\n합계 : ' + user[user_key].price + '원\n';
      result += '-------------------------'
    }
  }

  return result;
}

function viewOrderMessage(res, text) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/MainLogo.jpg",
        "width": 245,
        "height": 180
      },
      "text": "※ 주문현황\n" + text?text:'',
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "확인",
      ]
    }
  };

  res.send(answer);
}

function burritoDetailMessage(res, text) {
    var answer = {
      "message" : {
        "photo": {
          "url": "http://54.180.82.68:8080/images/burrito.jpg",
          "width": 357,
          "height": 353
        },
        "text": "※ 브리또를 선택해 주세요" + (text?'\n'+text:''),
      },
      "keyboard": {
        "type": "text"
      }
    };

    res.send(answer);
}

function hotdogDetailMessage(res, text) {
    var answer = {
      "message" : {
        "photo": {
          "url": "http://54.180.82.68:8080/images/hotdog.jpg",
          "width": 357,
          "height": 287
        },
        "text": "※ 핫도그를 선택해 주세요" + (text?'\n'+text:''),
      },
      "keyboard": {
        "type": "text"
      }
    };

    res.send(answer);
}

function toppingDetailMessage(res, text) {
    var answer = {
      "message" : {
        "photo": {
          "url": "http://54.180.82.68:8080/images/topping.jpg",
          "width": 361,
          "height": 290
        },
        "text": "※ 토핑을 선택해 주세요" + (text?'\n'+text:'') + '\n\n(※ 완료 시 \"선택완료\" 입력)',
      },
      "keyboard": {
        "type": "text"
      }
    };

    res.send(answer);
}

function testMessage(res, text) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/MainLogo.jpg",
        "width": 245,
        "height": 180
      },
      "text": text,
    },
    "keyboard": {
      "type": "text"
    }
  };

  res.send(answer);
}

function getQuestion(menus) {
  var result = [];
  var lastIndex = 0;
  var sentence = [];
  for(var i=0;i<menus.length;i++) {
    if (lastIndex !== menus[i].qid) {
      lastIndex = menus[i].qid;
      result.push(sentence);
      sentence = [];
    }
    sentence.push(menus[i].name);
  }

  if (sentence.length>0) {
    result.push(sentence);
  }

  return result;
}

function getMenus(menus) {
  var result = [];
  var lastIndex = 0;
  var sentence = [];
  for(var i=0;i<menus.length;i++) {
    if (lastIndex !== menus[i].index) {
      lastIndex = menus[i].index;
      result.push(sentence);
      sentence = [];
    }
    sentence.push(menus[i].name);
  }

  if (sentence.length>0) {
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
      "photo": {
        "url": "http://54.180.82.68:8080/images/hot.jpg",
        "width": 590,
        "height": 232
      },
      "text": "※ 소스를 선택해 주세요",
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

function sideMessage(res, text) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/side.jpg",
        "width": 358,
        "height": 259
      },
      "text": "※ 사이드메뉴를 선택해 주세요" + (text?'\n'+text:'') + '\n\n(※ 완료 시 \"선택완료\" 입력)',
    },
    "keyboard": {
      "type": "text"
    }
  };

  res.send(answer);
}

function selectMainMenu(res) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/MainMenu.jpg",
        "width": 279,
        "height": 135
      },
      "text": "※ 메인메뉴를 선택해 주세요",
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
        "photo": {
          "url": "http://54.180.82.68:8080/images/user.jpg",
          "width": 309,
          "height": 223
        },
        "text": "※ 정보 제공에 동의하셨습니다.\n(다음 양식에 맞추어 내용을 입력해 주세요)\n\n" + concept,
      },
      "keyboard": {
        "type": "text"
      }
    };

    res.send(answer);
}

function orderFail(res,text) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/MainLogo.jpg",
        "width": 245,
        "height": 180
      },
      "text": "※ 주문 목록이 없습니다." + (text?'\n'+text:''),
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "1. 메뉴 주문하기",
        "2. 사이드 주문하기",
        "3. 메뉴 선택완료",
        "4. 주문 현황 확인"
      ]
    }
  };

  res.send(answer);
}

function orderDone(res,text) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/MainLogo.jpg",
        "width": 245,
        "height": 180
      },
      "text": "※ 주문이 완료되었습니다." + (text?'\n'+text:''),
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "1. 메뉴 주문하기",
        "2. 사이드 주문하기",
        "3. 메뉴 선택완료"
      ]
    }
  };

  res.send(answer);
}

function mainMenu(res,text) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/MainLogo.jpg",
        "width": 245,
        "height": 180
      },
      "text": "※ 메뉴를 선택해 주세요." + (text?'\n'+text:''),
    },
    "keyboard": {
      "type": "buttons",
      "buttons": [
        "1. 메뉴 주문하기",
        "2. 사이드 주문하기",
        "3. 메뉴 선택완료"
      ]
    }
  };

  res.send(answer);
}

function agreePrivateInfoUse(res) {
  var answer = {
    "message" : {
      "photo": {
        "url": "http://54.180.82.68:8080/images/user.jpg",
        "width": 309,
        "height": 223
      },
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
      ],
      side: [

      ],
      price: 0,
      pay: '',
      address: ''
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
