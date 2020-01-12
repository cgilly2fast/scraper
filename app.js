const express = require("express");
const fs = require("fs");
const moment = require("moment");
const app = express();
const port = 3000;

const { google } = require("googleapis");
const authorize = require("./google-calendar-auth");
const cheerio = require("cheerio");
const axios = require("axios");
const siteUrl =
  "https://www.hwyoneprop.com/highway-one-vacation-rentals/27-calle-del-pradero";
const calendarId =
  "dipseapm.com_tjp0k5nhhm6kk4bo2u5kgaiv7c@group.calendar.google.com";

app.get("/", (request, response) => {
  const availability = [];

  axios.get(siteUrl).then(res => {
    const $ = cheerio.load(res.data);

    $("table.rc-calendar.rcav-month").each((index, element) => {
      let date = $(element)
        .find("caption.rc-calendar-month.rcjs-page-caption")
        .text();
      let days = [];

      $(element)
        .find("td.day")
        .each((index, element) => {
          if ($(element).hasClass("av-IN")) {
            if (days.length === 0) {
              days.push([
                { day: new Date().getDate() - 1 + "", type: "checked-in" },
                { day: $(element).text(), type: "checked-out" }
              ]);
            } else {
              days[days.length - 1].push({
                day: $(element).text(),
                type: "checked-out"
              });
            }
          } else if ($(element).hasClass("av-OUT")) {
            days.push([{ day: $(element).text(), type: "checked-in" }]);
          }
        });
      availability.push({ [date]: days });
    });

    let jsonString = JSON.stringify({ availability });

    fs.readFile("credentials.json", (err, content) => {
      if (err) return console.log("Error loading client secret file:", err);
      authorize(JSON.parse(content), auth => {
        const calendar = google.calendar({ version: "v3", auth });
        // clear all events
        calendar.events
          .list({
            calendarId
          })
          .then(res => {
            res.data.items.forEach(item => {
              calendar.events.delete({
                calendarId,
                eventId: item.id
              });
            });
          });
        // insert new events
        availability.forEach(i => {
          let month = Object.keys(i)[0];
          i[month].forEach(dayItem => {
            calendar.cal;
            calendar.events.insert(
              {
                auth,
                calendarId,
                resource: {
                  summary:
                    titleCase("HWY1: " + siteUrl.match(/([^\/]+$)/)[0].replace(/-/g, " ")),
                  start: {
                    dateTime: moment().month(month).date(dayItem[0].day).subtract(1, "day").toISOString()
                  },
                  end: {
                    dateTime: moment().month(month).date(dayItem[1].day).subtract(1, "day").toISOString()
                  }
                }
              },
              function(err, event) {
                if (err) {
                  console.log(
                    "There was an error contacting the Calendar service: " + err
                  );
                  return;
                }
                console.log("Event created: %s", event.data.htmlLink);
              }
            );
          });
        });
      });
    });

    fs.writeFileSync("./output.json", jsonString, "utf-8");

    response.send(availability);
  });
});

function titleCase(string) {
  var sentence = string.toLowerCase().split(" ");
  for (var i = 0; i < sentence.length; i++) {
    sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
  }
  
  var final = sentence.join(" ");
  return final;
}

app.listen(port, () => console.log(`App listening on port ${port}!`));
