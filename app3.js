
var mecab = require('mecab-ya'); //형태소 분석기 라이브러리.

// 메뉴 선택 버튼 누름.
// 피나치공으로 할게 ~~~
// 메뉴선택

mecab.pos('후라이드 치킨', function(err,result) {
  console.log(result);
});

mecab.pos('콜라 추가해줘', function(err,result) {
  console.log(result);
});

mecab.pos('젓가락 많이줘', function(err,result) {
  console.log(result);
});

mecab.pos('카스 2개 추가', function(err,result) {
  console.log(result);
});

mecab.pos('카스 1개 빼줘', function(err,result) {
  console.log(result);
});

// 선택 완료

// 번호는 010~~~~~~~~~이고, 멀티관 502로 배달해줘

// 주문완료

// 주문확인
