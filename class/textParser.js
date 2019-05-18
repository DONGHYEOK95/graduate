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


  // mecab.pos(content, function(err,result) {
  //   answer = {
  //     "message" : {
  //       "text": "※ 형태소 분석 결과\n" + result.toString(),
  //       "keyboard": {
  //         "type": "text"
  //       }
  //     }
  //   };
  //   res.send(answer);
  // });
});
