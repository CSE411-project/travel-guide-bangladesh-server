const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const port = 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efdix.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());


app.get('/', (req, res) => {
    res.send("Hello from db it's working fine !!");
})

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    if(err) {
        console.log("Error --->", err);
        return;
    }
    console.log("Connected successfully");

    const groupCollection = client.db(process.env.DB_NAME).collection("group");
    const destinationCollection = client.db(process.env.DB_NAME).collection("destination");
    const adminCollection = client.db(process.env.DB_NAME).collection("admin");

    app.post('/checkAdmin', (req, res) => {
        const queryEmail = req.body.email;

        adminCollection.find({email: queryEmail})
        .toArray((err, document) => {
            if(document.length)
                res.send({adminVerified: true});
            else
                res.send({adminVerified: false});
        });
    });

    app.get('/groupList', (req, res) => {
        groupCollection.find({})
            .toArray((err, documents) => {
                res.status(200).send(documents);
            });
    });

    app.post('/addGroup', (req, res) => {
        const group_name = req.body.group_name;
        const fb_url = req.body.fb_url;
        const group_description = req.body.group_description;
        const like_count = req.body.like_count;
        const logo_image = req.files.logo;
        console.log(group_name, fb_url, group_description, like_count, logo_image);


        console.log("Processing Data...");

        const newImg = logo_image.data;
        const encImg = newImg.toString('base64');

        const logo = {
            contentType: logo_image.mimetype,  // mimetype = jpeg/png/jpg... etc
            size: logo_image.size,
            img: Buffer.from(encImg, 'base64')
        };

        groupCollection.insertOne({ group_name, fb_url, group_description, like_count, logo })
            .then(result => {
                console.log("Data sent successfully !!");
                res.send(result.insertedCount > 0);
            })
    });

    app.post('/addDescription', (req, res) => {
        const destination_name = req.body.destination_name;
        const destination_district = req.body.destination_district;
        const destination_description = req.body.destination_description;
        const like_count = req.body.like_count;
        const destinationImage = req.files.destinationImage;
        console.log(destination_name, destination_district, destination_description, like_count, destinationImage);


        console.log("Processing Data...");

        const newImg = destinationImage.data;
        const encImg = newImg.toString('base64');

        const destImage = {
            contentType: destinationImage.mimetype,  // mimetype = jpeg/png/jpg... etc
            size: destinationImage.size,
            img: Buffer.from(encImg, 'base64')
        };

        destinationCollection.insertOne({ destination_name, destination_district, destination_description, like_count, destImage })
            .then(result => {
                console.log("Data sent successfully !!");
                res.send(result.insertedCount > 0);
            })
    });
});

app.listen(process.env.PORT || port);