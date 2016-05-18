"use strict"

const request = require('request')
const requestSync = require('sync-request')
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
const interval = conf.interval * 1000

;(function main() {
    checkArticles()
    console.log("Bot running "+date())
    fireTimer()
    // tweet('Bot running. '+date())
})()

function checkArticles() {
    articles.forEach((article) => {
        checkURL(composeQuery(article))
    })
}

function checkURL(url){
    const urlCheck = requestSync('GET', url)
    try {
        if (JSON.parse(urlCheck.getBody('utf8')).batchcomplete === '') {
            console.log('There is a problem with this URL:\r\n'+url)
            throw new Error('Check article names in conf.json')
        }
    }
    catch(error) {
        console.error(error)
        process.exit(1)
    }
}

function date(){
    return new Date(Date.now())
}

function composeQuery(articleName) {
    return queryStart+articleName+queryEnd
}

function fireTimer() {
    setInterval(function(){
        checkWikipedia() 
        composeTweet()
    }, interval)
}

function checkWikipedia() {
    articles.forEach((name) => {
        request({url:composeQuery(name), encoding:"utf8"}, (err, res, body) => {
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
