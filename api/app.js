const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const ip = require('ip');

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust the X-Forwarded-For header
app.set('trust proxy', true);

app.get('/api/', async(req, res) => {
    res.json({ message: 'Welcome, you foolish person!' })
})

app.get('/api/hello', async (req, res) => {
    const visitorName = req.query.visitor_name || 'Guest';

    if (!visitorName) {
        throw new Error('Visitor name is required');
    }

    let clientIp = req.ip || req.connection.remoteAddress;
    // let formattedIp = ip.toString(clientIp);

    console.log(`Client IP: ${clientIp}`);

    if (clientIp === '::1' || clientIp === '127.0.0.1') {
        clientIp = '8.8.8.8'; 
    } else {
        let formattedIp = ip.toString(clientIp);
    } 

    try {
        // Get location data from IPinfo
        const locationResponse = await axios.get(`https://ipinfo.io/${formattedIp}?token=${process.env.IPINFO_TOKEN}`);

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
        console.error('Error handling /api/hello route', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.port || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});