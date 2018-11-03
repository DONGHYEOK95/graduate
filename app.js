var express=require('express');
var app=express();
var bodyparser=require('body-parser');

app.use(bodyparser.json());
app.listen(8080, function(){
  console.log('server is running');
});

app.get('/keyboard', function(req, res) {
  var keyboard={
    "type":"text"
  };

  res.send(keyboard);
});

app.post('/message', function(req, res) {
  var user_key = decodeURIComponent(req.body.user_key);
  var type = decodeURIComponent(req.body.type);
  var content = decodeURIComponent(req.body.content);

  var answer = {
    "message" : {
      "text" : content
    }
  }

  res.send(answer);
});
