'use strict'

const jsonFile = require('jsonfile')

module.exports = (function() {

    const dataFile = "data.json"

    function printData() {
        let data = jsonFile.readFileSync(dataFile)
        console.log(JSON.stringify(data, null, 3))

    }

    function loadData(){
        let data = jsonFile.readFileSync(dataFile)
        return data;
    }

    function saveData(dataObj){
        jsonFile.writeFileSync(dataFile, dataObj)
    }

    function getRevisions(body) {
        let json = JSON.parse(body).query.pages

        for (var key in json) {
            if (json[key].revisions) return json[key].revisions
        }

        return null
    }

    function scrapeData(arr, name) {

        // Data example
        // "revid": 715822978,
        // "parentid": 715791245,
        // "user": "Thalia42",
        // "timestamp": "2016-04-18T06:51:46Z",
        // "comment": "/* Mayor of Burlington */"

        // Want to collect:
        // total_revisions: n
        // user_totals: { userA: n, userB: n ...}
        // daily_totals: { dd/mm/yyyy: n, ...}
        // number_of_revisions_since_last: n
        // latest_url: "https://..."
        // latest_comment: "comment"

        function loadLastChecked(name){
            let data = jsonFile.readFileSync(dataFile)
            if (data[name] !== undefined) return data[name].lastChecked
            
            return Date.now();
        }

        let lastChecked = loadLastChecked(name)

        let newRevisions = arr.filter((item) => { 
            let editDate = Date.parse(item.timestamp)
            return editDate >= lastChecked
        })

        let revisionCount = newRevisions.length,
            editors = [],
            dates = [],
            cur = 0,
            comment,
            url,
            latestEditor

        newRevisions.forEach((item) => {
            let editor = item.user
            editors.push(editor)
            let date = item.timestamp.split("T")[0]
            dates.push(date)

            let revDate = Date.parse(item.timestamp)
            if (revDate > cur) {
                cur = revDate            
                comment = item.comment
                url = "https://en.wikipedia.org/w/index.php?title="+name+"&oldid="+item.revid
                latestEditor = item.user
            }
        })

        let dateNow = Date.now()

        updateDataFile({
            name: name,
            revisionCount: revisionCount,
            editors: editors,
            dates: dates,
            latestComment: comment,
            latestURL: url,
            lastChecked: dateNow,
            latestEditor: latestEditor
        })
    }

    function updateDataFile(newData){
        let name = newData.name,
            revisionCount = newData.revisionCount,
            editors = newData.editors,
            dates = newData.dates,
            latestComment = newData.latestComment,
            latestURL = newData.latestURL,
            lastChecked = newData.lastChecked,
            latestEditor = newData.latestEditor

        let fileData = loadData()

        fileData.started = fileData.started || Date.now();

        fileData[name] = fileData[name] || {}
        fileData[name].editors = fileData[name].editors || {} 
        fileData[name].dates = fileData[name].dates || {}
        fileData[name].latestURL = latestURL || fileData[name].latestURL || ""
        fileData[name].latestComment = latestComment || fileData[name].latestComment || ""
        fileData[name].latestEditor = latestEditor || fileData[name].latestEditor || ""

        let lastCount = fileData[name].revisionCount || 0,
            newCount

        if (revisionCount > 0) {
            newCount = revisionCount + lastCount
            fileData[name].revisionCount = newCount
        }

        fileData[name].newRevisionCount = revisionCount

        editors.forEach((editor) => {
            fileData[name].editors[editor] = fileData[name].editors[editor] + 1 || 1
        })

        dates.forEach((date) => {
            fileData[name].dates[date] = fileData[name].dates[date] + 1 || 1
        })

        fileData[name].lastChecked = lastChecked

        saveData(fileData)

    }

    return {
        getRevisions: getRevisions,
        scrapeData: scrapeData,
        printData: printData,
        loadData: loadData
    }
})()



