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
    res.json({ message: 'Welcome, you foolish person!' });
})

app.get('/api/hello', async (req, res) => {
    let visitorName = req.query.visitor_name || 'Guest';

    // Remove quotes if they exist
    visitorName = visitorName.replace(/["']/g, "");

    if (!visitorName) {
        throw new Error('Visitor name is required');
    }

    let clientIp = req.ip || req.connection.remoteAddress;

    console.log(`Client IP: ${clientIp}`);

    if (clientIp === '::1' || clientIp === '127.0.0.1') {
        clientIp = '8.8.8.8';
    }

    let formattedIp = ip.isV6Format(clientIp) ? ip.toString(ip.toBuffer(clientIp)) : clientIp;

    try {
        // Get location data from IPinfo
        const locationResponse = await axios.get(`https://ipinfo.io/${formattedIp}?token=${process.env.IPINFO_TOKEN}`);

        console.log(locationResponse);

        // This is to obtain the longitude and latitude from locationResponse
        const { city, loc } = locationResponse.data; 

        if (!loc) {
            throw new Error('Location not available for IP address.');
        }

        // Get weather data from OpenWeatherMap
        const [latitude, longitude] = loc.split(',');
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
            greeting: `Hello, ${visitorName}! The temperature is ${temperature} degrees Celsius in ${city}`
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Error handling /api/hello route', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
