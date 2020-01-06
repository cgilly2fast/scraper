const express = require('express')
const fs = require('fs')
const app = express()
const port = 3000


const cheerio = require("cheerio");
const axios = require("axios");
const siteUrl = "https://www.hwyoneprop.com/highway-one-vacation-rentals/27-calle-del-pradero";

const availability = [];

app.get('/', (req, res) => {
  axios.get(siteUrl).then((response) => {
    const $ = cheerio.load(response.data)

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
        else if ($(element).hasClass('av-O')) {
          days.push({ day: $(element).text(), type: 'stayed' })
        }

      })
      availability.push({ [date]: days })
    })

    let jsonString = JSON.stringify({ availability });

    fs.writeFileSync('./output.json', jsonString, 'utf-8');

    res.send('done')

  })
})



app.listen(port, () => console.log(`App listening on port ${port}!`))