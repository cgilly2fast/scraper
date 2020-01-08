const express = require('express')
const fs = require('fs')
const app = express()
const port = 3000

const { google } = require('googleapis');
const cheerio = require("cheerio");
const axios = require("axios");
const siteUrl = "https://www.hwyoneprop.com/highway-one-vacation-rentals/27-calle-del-pradero";

const calendar = google.calendar({
  version: 'v3',
  auth: 'AIzaSyCwou7ggcvV5T6Aa8F9RYRG6DGD2ICh3io'
})


const availability = [];

app.get('/', (request, response) => {
  axios.get(siteUrl).then((res) => {
    const $ = cheerio.load(res.data)

    $('table.rc-calendar.rcav-month').each((index, element) => {
      let date = $(element).find('caption.rc-calendar-month.rcjs-page-caption').text()
      let days = []

      $(element).find('td.day').each((index, element) => {
        if ($(element).hasClass('av-OUT')) {
          days.push({ day: $(element).text(), type: 'checked-out' })
        }
        else if ($(element).hasClass('av-IN')) {
          days.push({ day: $(element).text(), type: 'checked-in' })
        }
        else if ($(element).hasClass('av-X')) {
          days.push({ day: $(element).text(), type: 'empty' })
        }

      })
      availability.push({ [date]: days })
    })

    let jsonString = JSON.stringify({ availability });

    fs.writeFileSync('./output.json', jsonString, 'utf-8');

    // calendar.events.list({
    //   calendarId: 'ahmedreo4@gmail.com',
    // }).then(res => {
    //   const events = res.data.items;
    //   if (events.length) {
    //     console.log('Upcoming 10 events:');
    //   } else {
    //     console.log('No upcoming events found.');
    //   }
    // })

    response.send('done')

  })
})



app.listen(port, () => console.log(`App listening on port ${port}!`))