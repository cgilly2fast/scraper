const express = require('express')
const fs = require('fs')
const moment = require('moment');
const app = express()
const port = 3000

const { google } = require('googleapis');
const authorize = require('./google-calendar-auth')
const cheerio = require("cheerio");
const axios = require("axios");
const siteUrl = "https://www.hwyoneprop.com/highway-one-vacation-rentals/27-calle-del-pradero";
const calendarId = 'hm51o0nkvs5jvgi06b7akk55c4@group.calendar.google.com'

const availability = [];

app.get('/', (request, response) => {
  axios.get(siteUrl).then((res) => {
    const $ = cheerio.load(res.data)

    $('table.rc-calendar.rcav-month').each((index, element) => {
      let date = $(element).find('caption.rc-calendar-month.rcjs-page-caption').text()
      let days = []

      $(element).find('td.day').each((index, element) => {
        if ($(element).hasClass('av-IN')) {
          days.push({ day: $(element).text(), type: 'checked-out' })
        }
        else if ($(element).hasClass('av-OUT')) {
          days.push({ day: $(element).text(), type: 'checked-in' })
        }

      })
      availability.push({ [date]: days })
    })

    let jsonString = JSON.stringify({ availability });

    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      authorize(JSON.parse(content), auth => {
        const calendar = google.calendar({ version: 'v3', auth });
        availability.forEach(i => {
          let month = Object.keys(i)[0]
          i[month].forEach(dayItem => {
            calendar.events.insert({
              auth,
              calendarId,
              resource: {
                'summary': dayItem.type,
                'start': {
                  'dateTime': moment(month, 'MMM YYYY').day(dayItem.day).toDate(),
                },
                'end': {
                  'dateTime': moment(month, 'MMM YYYY').day(dayItem.day).toDate(),
                },
              },
            }, function (err, event) {
              if (err) {
                console.log('There was an error contacting the Calendar service: ' + err);
                return;
              }
              console.log('Event created: %s', event.data.htmlLink);
            });
          })
        })
      });
    });

    fs.writeFileSync('./output.json', jsonString, 'utf-8');

    response.send('success')

  })
})

app.listen(port, () => console.log(`App listening on port ${port}!`))