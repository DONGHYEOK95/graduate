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
    "type": "text"
  };

  res.send(keyboard);
});

app.post('/message', function(req, res) {
  var user_key = decodeURIComponent(req.body.user_key);
  var type = decodeURIComponent(req.body.type);
  var content = decodeURIComponent(req.body.content);
  console.log(content);

  var answer = {
    "message" : {
      "text": textToSentence(content).toString(),
      "keyboard": {
        "type": "text"
      }
    }
  };
  res.send(answer);
});

var MEAN = {
  ORDER: 1,
  DONE: 2,
  DONT_UNDERSTAND: 3
};

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

function textToSentence(text) {
  var sentence = [];
  console.log(text);

  mecab.pos(text, function(err,result) {
    console.log(result);
    for (var i=0; i<result.length; i++) {
      sentence.push(result[i][0]);
    }
  });

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
