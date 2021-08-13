const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

let dbCon;
let app = express();
app.use(
  cors({
    origin: "*",
    method: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());
let initializeServerAndDb = async () => {
  try {
    dbCon = await open({
      filename: path.join(__dirname, "twitterClone.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("started");
    });
  } catch (error) {
    console.log(error);
  }
};

initializeServerAndDb();

app.post("/register/", async (req, res) => {
  let { username, password, name, gender } = req.body;
  let hashedPassword = await bcrypt.hash(password, 10);
  sqlQuery = `select * from user where username='${username}'`;
  let result = await dbCon.get(sqlQuery);
  if (result !== undefined) {
    res.status(400);
    res.send("User already exists");
  } else {
    if (password.length < 6) {
      res.status(400);
      res.send("Password is too short");
    } else {
      sqlQuery = `insert into user (username, password, name, gender) values ('${username}', '${hashedPassword}', '${name}', '${gender}')`;
      let result = await dbCon.run(sqlQuery);
      res.status(200);
      res.send("User created successfully");
    }
  }
});

app.post("/login/", async (req, res) => {
  console.log("called");

  let { username, password } = req.body;
  sqlQuery = `select * from user where username='${username}'`;
  let result = await dbCon.get(sqlQuery);
  if (result === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    console.log("here");

    let isPasswordMatched = await bcrypt.compare(password, result.password);
    console.log("isPasswordMatched", isPasswordMatched);
    if (isPasswordMatched) {
      let payload = { username: username };
      let jwtToken = jwt.sign(payload, "secret");
      res.status(200);
      console.log(jwtToken);
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

let mWareFunc = (req, res, next) => {
  let authToken = req.headers["authorization"];
  if (authToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    let token = authToken.split(" ")[1];
    if (token === undefined) {
      res.status(401);
      res.send("Invalid JWT Token");
    } else {
      jwt.verify(token, "secret", async (error, payload) => {
        if (error) {
          res.status(401);
          res.send("Invalid JWT Token");
        } else {
          req.actualUserName = payload.username;
          next();
        }
      });
    }
  }
};

app.get("/user/tweets/feed/", mWareFunc, async (req, res) => {
  console.log("called");

  sqlQueryToRetrieveFollowingIds = `select following_user_id from user inner join follower on user.user_id=follower.follower_user_id where user.username="${req.actualUserName}"`;
  let result = await dbCon.all(sqlQueryToRetrieveFollowingIds);
  console.log(result);
  fiD = [];
  for (let index = 0; index < result.length; index++) {
    const element = result[index]["following_user_id"];
    fiD.push(element);
  }
  querier = "(" + fiD.toString() + ")";
  console.log(querier);

  sqlQuery = `select username,tweet,date_time as dateTime from user natural join tweet where user.user_id in ${querier} order by date_time desc limit 4`;
  console.log(sqlQuery);

  let result2 = await dbCon.all(sqlQuery);
  res.send(result2);
});

app.get("/user/following/", mWareFunc, async (req, res) => {
  sqlQuery = `select following_user_id from user inner join follower on user.user_id=follower.follower_user_id where user.username='${req.actualUserName}'`;
  let result = await dbCon.all(sqlQuery);
  idsOfFollowings = [];
  for (let index = 0; index < result.length; index++) {
    const element = result[index]["following_user_id"];
    idsOfFollowings.push(element);
  }
  console.log(result);
  querier = "(" + idsOfFollowings.toString() + ")";
  sqlQuery2 = `select name from user where user_id in ${querier}`;
  let result2 = await dbCon.all(sqlQuery2);
  console.log(idsOfFollowings);
  console.log(result2);
  res.send(result2);
});

app.get("/user/followers/", mWareFunc, async (req, res) => {
  sqlQueryToRetrieveFollowersIds = `select follower_user_id from user inner join follower on user.user_id=follower.following_user_id where user.username="${req.actualUserName}"`;
  let result = await dbCon.all(sqlQueryToRetrieveFollowersIds);
  console.log(result);
  //   res.send(result);
  folId = [];
  for (let index = 0; index < result.length; index++) {
    const element = result[index]["follower_user_id"];
    folId.push(element);
  }
  console.log(folId);
  querier = "(" + folId.toString() + ")";
  console.log(querier);
  sqlQuery2 = `select name from user where user_id in ${querier}`;
  let result2 = await dbCon.all(sqlQuery2);
  //   console.log(idsOfFollowings);
  console.log(result2);
  res.send(result2);
});

app.get("/tweets/:tweetId/", mWareFunc, async (req, res) => {
  let { tweetId } = req.params;
  console.log(tweetId);

  let following;
  sqlQuery = `select tweet_id from (user inner join follower on user.user_id=follower.follower_user_id) natural join tweet where user.username='${req.actualUserName}'`;
  console.log("sqlQuery");
  let result = await dbCon.all(sqlQuery);
  console.log(result);
  allTweetIds = [];
  for (let index = 0; index < result.length; index++) {
    const element = result[index]["tweet_id"];
    allTweetIds.push(element);
  }
  if (allTweetIds.includes(parseInt(tweetId))) {
    sqlQuery = `select tweet,count(like_id) as likes,count(reply_id) as replies,tweet.date_time as dateTime from tweet natural join like natural join reply`;
    let result = await dbCon.get(sqlQuery);
    res.send(result);
  } else {
    console.log("not invalid token");

    res.status(401);
    res.send("Invalid Request");
  }
});

app.get("/tweets/:tweetId/likes/", mWareFunc, async (req, res) => {
  let { tweetId } = req.params;
  console.log(tweetId);

  sqlQuery = `select following_user_id from user inner join follower on user.user_id=follower.follower_user_id where user.username='${req.actualUserName}'`;
  let result = await dbCon.all(sqlQuery);
  idsOfFollowings = [];
  for (let index = 0; index < result.length; index++) {
    const element = result[index]["following_user_id"];
    idsOfFollowings.push(element);
  }
  console.log(result);
  querier = "(" + idsOfFollowings.toString() + ")";
  sqlQuery2 = `select tweet_id from tweet where user_id in ${querier}`;
  let result2 = await dbCon.all(sqlQuery2);
  console.log(idsOfFollowings);
  console.log(result2);
  allowedTweetIdArray = [];
  for (let index = 0; index < result2.length; index++) {
    const element = result2[index]["tweet_id"];
    allowedTweetIdArray.push(element);
  }
  console.log(allowedTweetIdArray);
  querier2 = "(" + allowedTweetIdArray.toString() + ")";
  console.log(typeof tweetId);
  //   console.log());
  if (!allowedTweetIdArray.includes(parseInt(tweetId))) {
    res.status(401);
    console.log("not-allowed");
    res.send("Invalid Request");
  } else {
    console.log("here");

    console.log(allowedTweetIdArray.includes(tweetId));

    sqlQuery3 = `select * from like where tweet_id =${tweetId}`;
    let result3 = await dbCon.all(sqlQuery3);
    alp = [];
    for (let index = 0; index < result3.length; index++) {
      const element = result3[index]["user_id"];
      alp.push(element);
    }
    q3 = "(" + alp.toString() + ")";
    // console.log(result3);
    // console.log(q3);
    sqlQuery4 = `select name from user where user_id in ${q3}`;
    // console.log("at q4");

    let result4 = await dbCon.all(sqlQuery4);
    console.log(result4);

    fin_sender = [];
    for (let index = 0; index < result4.length; index++) {
      const element = result4[index]["name"];
      fin_sender.push(element);
    }
    console.log({ likes: fin_sender });
    res.send({ likes: fin_sender });
  }
});

app.get("/tweets/:tweetId/replies/", mWareFunc, async (req, res) => {
  const { tweetId } = req.params;
  sqlQuery = `select name,reply from user inner join follower on user.user_id=follower.follower_user_id inner join tweet on follower.following_user_id=tweet.user_id inner join reply on reply.tweet_id=tweet.tweet_id  where user.username="${req.actualUserName}" and tweet.tweet_id=${tweetId};`;
  let result = await dbCon.all(sqlQuery);
  if (result.length !== 0) {
    console.log(result);
    res.send(JSON.stringify(result));
  } else {
    res.status(401);
    res.send("Invalid Request");
  }
});

app.get("/user/tweets/", mWareFunc, async (req, res) => {
  sqlQuery = `select tweet.tweet,count(like_id) as likes,count(reply_id) as replies ,tweet.date_time as dateTime from tweet inner join user on tweet.user_id=user.user_id inner join like on like.tweet_id=tweet.tweet_id inner join reply on reply.tweet_id=tweet.tweet_id where user.username="${req.actualUserName}"`;
  let result = await dbCon.all(sqlQuery);
  console.log(result);
  res.send(result);
});

app.post("/user/tweets/", mWareFunc, async (req, res) => {
  console.log("here");

  const { tweet } = req.body;
  //   console.log(req.actualUserName);
  sqlQuery = `select user_id from user where username="JoeBiden"`;
  let userId = await dbCon.get(sqlQuery);
  me = userId["user_id"];
  sqlQuery2 = `insert into tweet (tweet,user_id) values("${tweet}",${me})`;
  let add = await dbCon.run(sqlQuery2);
  res.send("Created a Tweet");
});

app.delete("/tweets/:tweetId/", mWareFunc, async (req, res) => {
  const { tweetId } = req.params;
  myTweets = [];
  sqlQuery = `select tweet.tweet_id from tweet natural join user where user.username="${req.actualUserName}" `;
  let result = await dbCon.all(sqlQuery);
  for (let index = 0; index < result.length; index++) {
    const element = result[index]["tweet_id"];
    myTweets.push(element);
  }
  console.log(myTweets);
  //   console.log(result);
  querier = "(" + myTweets.toString() + ")";
  if (querier.includes(parseInt(tweetId))) {
    sqlQuery2 = `delete from tweet where tweet_id=${tweetId}`;
    let result2 = dbCon.run(sqlQuery2);
    res.send("Tweet Removed");
  } else {
    res.status(401);
    res.send("Invalid Request");
  }
});

module.exports = app;
