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
const calendarId = 'a126r0unk7kqegmh0oamolfubs@group.calendar.google.com'


app.get('/', (request, response) => {

  const availability = [];

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
        // clear all events
        calendar.events.list({
          calendarId,
        }).then((res) => {
          res.data.items.forEach((item) => {
            calendar.events.delete({
              calendarId,
              eventId: item.id
            })
          })
        })
        // insert new events
        availability.forEach(i => {
          let month = Object.keys(i)[0]
          i[month].forEach(dayItem => {
            calendar.cal
            calendar.events.insert({
              auth,
              calendarId,
              resource: {
                'summary': dayItem.type,
                'start': {
                  'dateTime': moment(new Date(month + ' ' + dayItem.day)).format(),
                },
                'end': {
                  'dateTime': moment(new Date(month + ' ' + dayItem.day)).format(),
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

    response.send(availability)

  })
})

app.listen(port, () => console.log(`App listening on port ${port}!`))