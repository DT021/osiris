// @Environment Variable File Integration
require('dotenv').config();

// @Twitter API Integration
const authentication = {

  // @Environment Variables
  consumer_key: process.env.CONSUMER_KEY,

  consumer_secret: process.env.CONSUMER_SECRET,

  access_token: process.env.ACCESS_TOKEN,

  access_token_secret: process.env.ACCESS_TOKEN_SECRET

}

// @Twitter 
const twitter = new ( require('twit') )(authentication);

const stream = twitter.stream('statuses/filter', { track: '@osiris_tweets, osiris'} );

// @RiveScript
const robot = new ( require('rivescript') )();

let tweetQueue = []; let limits = { stream: false, tweet: false, delay: null };

const shortUniqueId = new ( require('short-unique-id') )();

// @Stream Handlers
stream.on('connect', async function() {

  console.log('Stream Connected');

  await robot.loadDirectory('brain');

  setInterval(function() {

    // Automatic Handling of Tweeting
    if (limits.delay && Math.abs(new Date() - limits.delay) > 15 * 60e3) {
  
      limits.tweet = false;
  
      limits.delay = null;
  
    }
  
    if (limits.stream || limits.tweet) return;
  
    if (tweetQueue.length > 0) twitter.post('statuses/update', tweetQueue.shift(), function(error, result, response) {
  
      if (error) { limits.tweet = true; limits.delay = new Date(); }

      else { console.log('Tweet Successful'); }
  
    });
  
  }, 100);

  console.log('Cycle Running');

});

stream.on('disconnect', function() { 
  
  limits.stream = true; 

  console.log('Stream Disconnected');

});

stream.on('reconnect', function() { 
  
  limits.stream = false; 

  console.log('Stream Reconnected');

});

stream.on('tweet', function(tweet) {

  console.log('Streamed Tweet Received');

  const username = tweet.user.screen_name;

  let content = tweet.retweeted_status ? tweet.retweeted_status : tweet;

  content = content.extended_tweet ? content.extended_tweet.full_text : content.text;

  if ( content.includes('@osiris_tweets') ) {

    console.log('Received Tweets of Criteria');

    content = content.replace(/@osiris_tweets/g, '');

    robot.sortReplies();

    robot.reply(username, content).then(function(reply) {
      
      tweetQueue.push({ in_reply_to_status_id: tweet.id_str, status: `@${username}\n${reply} [${shortUniqueId.randomUUID(7)}]` });

      console.log('Tweet Added to Queue');
      
    }).catch(error => console.log(error) );

  }

})