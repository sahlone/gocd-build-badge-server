
var express = require('express');
var app = express();
var Redis = require('ioredis');
var bodyParser = require('body-parser');
var redis = new Redis(process.env.REDIS_URL || 6379);

var STATUS_CONV = {
  "passed": {
    "color": "#4c1",
    "text": "passed"
  },
  "failed": {
    "color": "#e05d44",
    "text": "failed"
  },
  "unknown": {
    "color": "#9f9f9f",
    "text": "unknown"
  }
}

app.use(bodyParser.json()); // for parsing application/json
app.set('port', (process.env.PORT || 5000));
app.set('etag', false); // Don't set ETags - to bypass Github Image caching

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.post('/status', function(request, response) {
  redis.set(request.body.pipeline, JSON.stringify(request.body));
  response.send({
    "response": "ok",
    "input": JSON.stringify(request.body)
  });
});

app.get('/badge/:pipeline', function(request, response) {
  redis.get(request.params.pipeline, function (err, result) {
    var r = STATUS_CONV['unknown'];
    if(result && !err) {
      pipelineStatus = JSON.parse(result);
      r = STATUS_CONV[pipelineStatus.status.toLowerCase()] || r;
    }
    // Headers to disable cache by Github's camo service
    // Refer - https://github.com/github/markup/issues/224#issuecomment-37663375
    response.header('Cache-Control', 'no-cache');
    response.header('Pragma', 'no-cache');
    response.header('Expires', 'Sat, 1 Jan 1970 00:00:00 GMT');
    response.header('Etag', Math.random());
    response.type('svg');
    response.render('pages/badge.svg.ejs', {
        color: r.color || "lightgrey",
        text: r.text || "unknown",
        size: request.query.size || 20
      });
  });
});

app.get('/debug/:pipeline', function(request, response) {
  redis.get(request.params.pipeline, function (err, result) {
    if(err) {
      console.error(err);
      response.send(500);
    } else {
      response.json(result);
    }
  });
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
