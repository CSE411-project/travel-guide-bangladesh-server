const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const imgbbUploader = require("imgbb-uploader");
const sharp = require('sharp');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;

require('dotenv').config();
const port = 5000;

const fileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './images')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '--' + file.originalname)
    }
});
const upload = multer({ storage: fileStorageEngine });

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efdix.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();
app.use(cors());
app.use(bodyParser.json());
// app.use(fileUpload());

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    if(err) {
        console.log("Error --->", err);
        return;
    }
    console.log("MongoDB connected successfully");

    const groupCollection = client.db(process.env.DB_NAME).collection("group");
    const destinationCollection = client.db(process.env.DB_NAME).collection("destination");
    const userCollection = client.db(process.env.DB_NAME).collection("user");

    app.post('/checkUser', (req, res) => {
        const userEmail = req.body.email;
        const userName = req.body.name;
        const userPhoto = req.body.photo;

        userCollection.find({email: userEmail})
        .toArray((err, document) => {
            if(document.length)
                res.status(200).send(document[0]);
            else {
                const user = {
                    email: userEmail,
                    name: userName,
                    photo: userPhoto,
                    isAdmin: false,
                    liked_destinations: [],
                    liked_groups: [],
                    liked_guided: [],
                    bookmarks: []
                };

                userCollection.insertOne(user)
                    .then(result => {
                        console.log("User info inserted successfully.")
                        res.status(200).send(user);
                    });
            }
                // res.send({adminVerified: false});
        });
    });

    app.post('/updateUserBookmark', (req, res) => {
        userCollection.updateOne(
            { email: req.body.email },
            {
                $set: { bookmarks: req.body.bookmarks }
            }
        )
            .then(result => {
                console.log(result);
                console.log("Bookmarks updated successfully");
            })
    });

    app.post('/updateUserLikedDestination', (req, res) => {
        destinationCollection.updateOne(
            { email: req.body.email },
            {
                $set: {liked_destinations: req.body.likedDestinations}
            }
        )
            .then(result => {
                console.log(result);
                console.log("Liked Destination updated successfully");
            })
    });

    app.get('/groupList', (req, res) => {
        groupCollection.find({})
            .toArray((err, documents) => {
                res.status(200).send(documents);
            });
    });

    app.get('/destinationList', (req, res) => {
        destinationCollection.find({})
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

    app.post('/addDestination', upload.any("destinationImage"), (req, res) => {
        const destination_name = req.body.destination_name;
        const destination_district = req.body.destination_district;
        const destination_description = req.body.destination_description;
        const like_count = req.body.like_count;
        const destinationImages = req.files;
        
        const getDestImage = async () => {
            const destImage = [];

            for(let i=0; i<destinationImages.length; i++) {
                const resizeLocation = destinationImages[i].destination + "/" + Date.now() + "---" + req.files[i].originalname;
                
                async function resizeImage() {
                    await sharp(destinationImages[i].path)
                    .resize(1400, 800)
                    .jpeg({
                        chromaSubsampling: '4:2:0'
                    })
                    .withMetadata()
                    .toFile(resizeLocation);
                    
                    return imgbbUploader(process.env.IMGBB_API, resizeLocation)
                    .then((response) => {
                        return (response.url);
                    })
                    .catch((error) => console.error(error));
                }
                
                const imgURL = await resizeImage();
                destImage.push(imgURL);
            }

            return destImage;
        }

        getDestImage().then(images => {
            destinationCollection.insertOne({ destination_name, destination_district, destination_description, like_count, destImageURL: images })
            .then(result => {
                console.log("Destination data sent successfully !!");
                res.send(result.insertedCount > 0);
            });
        });
    });

    app.get('/destination/:destinationId', (req, res) => {
        const destinationId = req.params.destinationId;
        
        const dest_id = new mongo.ObjectID(destinationId);
        destinationCollection.find({'_id': dest_id})
            .toArray((err, documents) => {
                res.status(200).send(documents[0])
            });
    })
});

app.listen(process.env.PORT || port, () => {
    console.log(`Server is listening to port ${port}`);
});


