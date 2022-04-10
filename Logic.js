import { Octokit } from "https://cdn.skypack.dev/@octokit/core";
import token from './config.js'
let period = 6; //* period in months
let date = new Date()
date.setMonth(date.getMonth() - period);
// console.log(date)



const Logic = async () => {

    //! this part to process data from API
    let base = []; //* empty array to push inc data from API into because limited to 100 entries per call.
    let pageNum = 1; //! change back to 1 after testing
    let perPage = 100; //* max 100
    let stopped = false; //* control while loop

    const octokit = new Octokit({ auth: `${token}` }); //* github personal access token

    // const response =  await octokit.request('GET /repos/{owner}/{repo}/commits', {
    //             owner: 'apache',
    //             repo: 'airflow',
    //             since: `${date}`,
    //             per_page: perPage,
    //             page: 9,
    //         });
    //         const incoming = response.data;
    //         base.push(incoming);
    while(stopped === false){

        const response =  await octokit.request('GET /repos/{owner}/{repo}/commits', {
            owner: 'apache',
            repo: 'airflow',
            since: `${date}`,
            per_page: perPage,
            page: pageNum,
        });
        const incoming = response.data;
        base.push(incoming); //* push incoming data into base array for post processing
        console.log(pageNum)
        pageNum++; //* increment page num
        if (incoming.length < perPage){ //* currently set to 100 entries per page, if length < 100 means reached last page based on inputted time period
            stopped = true;
        }
    }
    console.log(base)
    let authors = []; //* this array is all the authors
    for (let i=0;i<base.length;i++){
        base[i].map((obj)=>{
            // console.log(obj.commit.author.name)
            authors.push(obj.commit.author.name)
        })
    }
    // console.log(authors)
    authors = authors.flat(); //* flatten array
    
    //! Part 1 - Find top 5 committers ranked by count and their number of commits
    let authorCount = []; //* [[author, count],[author, count]]
    let arrCommitCount = []; //* [count, count] same layout as authorCount just without the author, easier to do math operations
    for (let i=0;i<authors.length;i++){
        if(authorCount.find(arr => arr[0] === authors[i])){ //* if authorCount has entry with same name as author[i], find index of entry and increase authorCount and arrCommitCount
            let index = authorCount.findIndex(arr => arr[0] === authors[i]);
            authorCount[index][1] += 1;
            arrCommitCount[index] += 1;
        } else { //* if not push new entry into both arrays
            authorCount.push([authors[i], 1])
            arrCommitCount.push(1)
        }
    }
    //* find 5 highest count
    // console.log(authorCount)
    let highestCounts = [];

    function findHighestCounts(arrCommitCount){
        let max = Math.max(...arrCommitCount); //* find max
        let index = arrCommitCount.findIndex(elem => elem === max); //* find index of max
        // console.log(index)
        highestCounts.push(arrCommitCount.slice(index, index+1)); //* slice out and put in highestCounts array
        arrCommitCount.splice(index, 1, 0); //* splice and replace with 0 to avoid pulling same data

        if (highestCounts.length !== 5){ //* repeat until array has 5 entries, could refactor to include dupes for 5th highest. 
            return findHighestCounts(arrCommitCount)
        }
        return highestCounts
    }
    let filtered = findHighestCounts(arrCommitCount).flat();
    let filteredAuthorAndCount = [];
    //! link back to authorCount array and display 5 highest -> can actually just use code above since index will be same
    for (let i = 0; i<filtered.length;i++){
        let index = authorCount.findIndex(elem => elem[1] === filtered[i])
        // console.log(index)
        filteredAuthorAndCount.push(authorCount[index]); //* same as above, push then splice to prevent dupe authors
        authorCount.splice(index,1,0);
    }

    console.log(`Top 5 commiters and number of commits: `, filteredAuthorAndCount);

    document.querySelector('#part1').innerText = `Top 5 commiters and number of commits:
    \n${filteredAuthorAndCount[0][0]}, ${filteredAuthorAndCount[0][1]}
    \n${filteredAuthorAndCount[1][0]}, ${filteredAuthorAndCount[1][1]}
    \n${filteredAuthorAndCount[2][0]}, ${filteredAuthorAndCount[2][1]}
    \n${filteredAuthorAndCount[3][0]}, ${filteredAuthorAndCount[3][1]}
    \n${filteredAuthorAndCount[4][0]}, ${filteredAuthorAndCount[4][1]}`;


    //! Part 2 - Determine the committer with the longest commit streak.
    function longestStreak(){
        let streak = 1;
        let committer = '';
        let prevStreak = 0;
        let prevCommitter = '';
        for (let i=0;i<authors.length;i++){
            if (authors[i] === authors[i+1]){ //* last case is always false because authors[i+1] does not exist, so will always run the else case at the end to check the streak
                streak += 1;
                committer = authors[i];
            } else {
                if(prevStreak < streak){ //* if current streak more than prev streak, update prev streak and committer
                    prevStreak = streak;
                    prevCommitter = committer;
                } else {
                    streak = 1; //* if prev streak more then set streak to 1. 
                }
            }
        }
        document.querySelector('#part2').innerText = `Longest Commit Streak: ${prevStreak}, Committer: ${prevCommitter}`;

        return console.log(`Longest Commit Streak: ${prevStreak}, Committer: ${prevCommitter}`)
    }
    longestStreak();




    //! Part 3 - Generate a heatmap of number of commits count by all users by day of the week and by 3 hour blocks.
    var zValues = [ 
        [0,0,0,0,0,0,0,0], 
        [0,0,0,0,0,0,0,0], 
        [0,0,0,0,0,0,0,0], 
        [0,0,0,0,0,0,0,0], 
        [0,0,0,0,0,0,0,0], 
        [0,0,0,0,0,0,0,0], 
        [0,0,0,0,0,0,0,0]
    ];
    let numCommit = 0;
    let lastArrLength = base[base.length-1].length;
    for (let i=0;i<base.length;i++){
        for (let j=0;j<perPage;j++){
            if (i === base.length-1 && j === lastArrLength){
                break
            }
            let range = 10; //* should throw error if any problem
            let time = base[i][j].commit.author.date
            let d = new Date(time); //* converts time to local time
            let day = d.getDay();
            let hour = d.getHours();
            // console.log(time, day, hour, i, j)
            if(hour <= 3){
                range = 0;
            }
            else if(hour <= 6){
                range = 1
            }
            else if(hour <= 9){
                range = 2
            }
            else if(hour <= 12){
                range = 3
            }
            else if(hour <= 15){
                range = 4
            }
            else if(hour <= 18){
                range = 5
            }
            else if(hour <= 21){
                range = 6
            }
            else if(hour <= 24){
                range = 7
            }
            zValues[day][range] += 1;
            numCommit++;
        }
    }
    console.log(`number of pages of data: ${base.length}`)
    console.log(`number of commits: ${numCommit}`) //* sanity check, number of pages of data vs number of commits

    // reference https://plotly.com/javascript/heatmaps/
    var xValues = ['0000-0300', '0300-0600', '0600-0900', '0900-1200', '1200-1500', '1500-1800', '1800-2100', '2100-0000'];
    var yValues = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    var colorscaleValue = [
    [0, '#3D9970'],
    [100, '#001f3f']
    ];

    var data = [{
    x: xValues,
    y: yValues,
    z: zValues,
    type: 'heatmap',
    colorscale: colorscaleValue,
    showscale: false
    }];
    var layout = {
        annotations: [],
        xaxis: {
          ticks: '',
          side: 'top'
        },
        yaxis: {
          ticks: '',
          ticksuffix: ' ',
          width: 700,
          height: 700,
          autosize: false
        },
        hovermode: false
      };
      
    for ( var i = 0; i < yValues.length; i++ ) {
        for ( var j = 0; j < xValues.length; j++ ) {
          var currentValue = zValues[i][j];
          if (currentValue != 0.0) {
            var textColor = 'white';
          }else{
            var textColor = 'black';
          }
          var result = {
            xref: 'x1',
            yref: 'y1',
            x: xValues[j],
            y: yValues[i],
            text: zValues[i][j],
            font: {
              family: 'Arial',
              size: 12,
              color: 'rgb(50, 171, 96)'
            },
            showarrow: false,
            font: {
              color: textColor
            }
          };
          layout.annotations.push(result);
        }
    }

    Plotly.newPlot( 'plot', data, layout);
};

let el = document.querySelector("#button");
el.addEventListener("click", async()=> {
    await Logic();
});