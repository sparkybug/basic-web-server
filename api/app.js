const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const ip = require('ip');

dotenv.config();

const app = express();

// Trust the X-Forwarded-For header
app.set('trust proxy', true);

app.get('/api/', async(req, res) => {
    res.json({ message: 'Welcome, you foolish person!' })
})

app.get('/api/hello', async (req, res) => {
    const visitorName = req.query.visitor_name || 'Guest';
    // const ip = req.ip === '::1' ? '127.0.0.1' : req.ip;
    let clientIp = req.ip;

    console.log(`Client IP: ${clientIp}`);

    if (clientIp === '::1' || clientIp === '127.0.0.1') {
        clientIp = '8.8.8.8'; 
    }else {
        clientIp = ip.toString(clientIp);
    } 

    try {
        // Get location data from IPinfo
        const locationResponse = await axios.get(`https://ipinfo.io/${clientIp}?token=${process.env.IPINFO_TOKEN}`);

        console.log(locationResponse);

        // This is to obtain the longitude and latitude from locationResponse
        const { city, location } = locationResponse.data; 

        if (!location) {
            throw new Error('Location not available for IP address.');
        }

        // Get weather data from OpenWeatherMap
        const [latitude, longitude] = location.split(',');
        const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: {
                lat: latitude,
                lon: longitude,
                units: 'metric',
                appid: process.env.WEATHER_API_KEY
            }
        });

        const temperature = weatherResponse.data.main.temp;

        // Build response
        const response = {
            client_ip: clientIp,
            location: city,
            greeting: `Hello, ${visitorName}!, the temperature is ${temperature} degrees Celsius in ${city}`
        };

        res.status(201).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.port || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});