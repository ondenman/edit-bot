"use strict"

const request = require('request')
const twitter = require('twitter')
const auth = require('./auth.js')
const data = require('./data-functions.js')
const jsonFile = require('jsonfile')

const conf = jsonFile.readFileSync('./conf.json')
const articles = conf.articles

const client = new twitter ({
    consumer_key: auth.consumer_key,
    consumer_secret: auth.consumer_secret,
    access_token_key: auth.access_token_key,
    access_token_secret: auth.access_token_secret
})

const queryStart = "https://en.wikipedia.org/w/api.php?action=query&titles="
const queryEnd = "&prop=revisions&rvlimit=500&format=json"

function date(){
    return new Date(Date.now())
}

function formQuery(name) {
    return queryStart+name+queryEnd
}

const interval = conf.interval * 1000

;(function main() {
    console.log("Bot running "+date())
    fireTimer()
    // tweet('Bot running. '+date())
})()

function fireTimer() {
    setInterval(function(){
        checkWikipedia() 
        composeTweet()
    }, interval)
}

function checkWikipedia() {
    articles.forEach((name) => {
        request({url:formQuery(name), encoding:"utf8"}, (err, res, body) => {
            if (!err) {
                let revisions = data.getRevisions(body)
                data.scrapeData(revisions, name)
            }
        })
    })
}

function composeTweet() {
    let fileData = data.loadData()
    articles.forEach((name)=> {
        if (fileData[name] && fileData[name].newRevisionCount > 0) {
            let revUrl = fileData[name].latestURL
            let revEditor = fileData[name].latestEditor
            let niceName = name.replace('_',' ')
            console.log("Update found for "+niceName)
            let tweetStr = "User "+revEditor+" has edited "+niceName+"'s Wikipedia page: "+revUrl
            tweet(tweetStr)
        }
    })
}

function tweet(str) {
    let tweet = {}
    tweet.status = str
    client.post('statuses/update', tweet,  function(err, tweet, res){
      if (!err) {
        console.log("Tweet sent! "+date())
      } else {
        console.dir("Twitter: "+err)
      }
    })
}
