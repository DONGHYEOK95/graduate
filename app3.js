
var mecab = require('mecab-ya'); //형태소 분석기 라이브러리.

mecab.pos('후라이드 치킨', function(err,result) {
  console.log(result);
});

mecab.pos('콜라 추가해줘', function(err,result) {
  console.log(result);
});

mecab.pos('젓가락 많이줘', function(err,result) {
  console.log(result);
});

mecab.pos('맥주 2개 추가', function(err,result) {
  console.log(result);
});

mecab.pos('맥주 1개 빼줘', function(err,result) {
  console.log(result);
});
